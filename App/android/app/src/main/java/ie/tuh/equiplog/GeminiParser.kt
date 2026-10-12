package ie.tuh.equiplog

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

data class ParsedLog(
    val action: LogAction?,
    val equipmentId: String?,
    val equipmentType: String?,
    val patientId: String?,
    val bed: String?,
    val durationHours: Int?,
    val durationLabel: String?,
    val corrections: List<String>,
    val ignored: List<String>,
    val clarification: String?,
    val confidence: String,
    val summary: String,
)

class ParseException(message: String) : Exception(message)

/** Calls the Gemini REST API (generateContent) with a JSON schema so the reply is machine-readable. */
object GeminiParser {
    const val DEFAULT_MODEL = "gemini-3.8-flash"
    private const val BASE = "https://generativelanguage.googleapis.com/v1beta/models"

    private val SYSTEM_PROMPT = """
        You turn a nurse's or therapist's spoken equipment log into a structured record for the
        Occupational Therapy equipment tracker at Tallaght University Hospital. The input is raw
        speech-to-text from a busy ward: expect filler words, false starts, mis-heard words,
        mid-sentence self-corrections, and side remarks that are not part of the request.

        How to resolve the transcript:
        - The speaker's final intent wins. When a value is restated or corrected ("no wait",
          "sorry", "actually", "I mean", "scratch that", "not that one", "make it", or simply a
          second different value for the same field), use the latest one and record each
          override in `corrections` as "<field>: <old> -> <new>".
        - Corrections can be partial: "4829 1053, no, ending 35" means 4829 1035; "bed 12, sorry,
          14" keeps the ward and changes the bed. Apply the change to the earlier value.
        - Numbers are often spoken digit by digit or in groups: "four eight two nine, ten
          fifty-three" = 48291053. "oh" means 0, "double five" means 55, "triple" repeats three.
          Speech-to-text may also split or join digits oddly; reassemble them.
        - Equipment IDs are HC21 numbers (usually 8 digits). Return digits only, exactly as the
          speaker finally stated them. IDs or patients that are not in the roster/patient list
          are fine (this is a demo): use them as heard and do not ask about them. If only an
          equipment type is given ("the gel cushion"), choose the matching roster item only if
          exactly one available item fits; otherwise leave equipment_id null and ask.
        - Patients are identified by ID (e.g. PT-90421, possibly spoken "P T nine oh four two
          one") or by bed (e.g. "bed 4B-12", "4B twelve", "bed twelve" on the speaker's own ward).
          Map a bed to its patient ID using the patient list and vice versa. Never output patient
          names; if a name is spoken, ignore it and note that in `ignored`.
        - Things mentioned in passing that are not this request ("the one next to bed 7 is
          broken by the way", "I'll do the cushion later") go in `ignored`, not in the fields.
          If the speaker clearly asks for a second action, handle only the main one and mention
          the second in `clarification`.
        - action: "book" when equipment is issued to a patient, "return" when it comes back,
          "repair" when it is faulty or needs service. Default to "book" if a patient and
          duration are given.
        - Duration: convert to hours (overnight = 16, "till Friday" = hours from now to Friday
          17:00, "the weekend" = until Monday 09:00). Put the short human form in duration_label
          ("3 weeks", "2 days"). Use null when no duration is mentioned.
        - confidence: "high" if every needed field is clear, "medium" if you resolved real
          ambiguity, "low" if a required field is missing or guessed.
        - summary: one short sentence describing the final resolved request.
        Use null for anything not stated. Do not invent values.
    """.trimIndent()

    private fun nullable(type: String, description: String) =
        JSONObject().put("type", JSONArray(listOf(type, "null"))).put("description", description)

    private fun stringArray() = JSONObject().put("type", "array").put("items", JSONObject().put("type", "string"))

    private val SCHEMA: JSONObject = JSONObject()
        .put("type", "object")
        .put(
            "properties", JSONObject()
                .put("action", nullable("string", "One of: book, return, repair"))
                .put("equipment_id", nullable("string", "Final 8-digit HC21 number, digits only"))
                .put("equipment_type", nullable("string", "Equipment type as spoken or from roster"))
                .put("patient_id", nullable("string", "Final patient ID, e.g. PT-90421"))
                .put("bed", nullable("string", "Final bed, e.g. 4B-12"))
                .put("duration_hours", nullable("integer", "Booking length in hours"))
                .put("duration_label", nullable("string", "Short human-readable duration"))
                .put("corrections", stringArray())
                .put("ignored", stringArray())
                .put("clarification", nullable("string", "Question for the user if something is missing or doubtful"))
                .put("confidence", JSONObject().put("type", "string").put("enum", JSONArray(listOf("high", "medium", "low"))))
                .put("summary", JSONObject().put("type", "string"))
        )
        .put(
            "required", JSONArray(
                listOf(
                    "action", "equipment_id", "equipment_type", "patient_id", "bed", "duration_hours",
                    "duration_label", "corrections", "ignored", "clarification", "confidence", "summary",
                )
            )
        )

    private fun contextBlock(): String {
        val roster = AppStore.equipment.joinToString("\n") {
            "- ${it.id} | ${it.type} | ${it.status.label} | ${it.location}"
        }
        val patients = AppStore.patients.joinToString("\n") { "- ${it.id} | Bed ${it.bed} | ${it.ward}" }
        val now = java.time.LocalDateTime.now().withNano(0)
        return """
            Speaker: ${AppStore.nurseName.value}, working on ${AppStore.ward.value}.
            Current date/time: $now (${now.dayOfWeek}).

            Equipment roster (HC21 id | type | status | location):
            $roster

            Patients (id | bed | ward):
            $patients
        """.trimIndent()
    }

    suspend fun parse(apiKey: String, model: String, transcript: String): ParsedLog = withContext(Dispatchers.IO) {
        val userText = "${contextBlock()}\n\n<transcript>\n$transcript\n</transcript>"
        val (code, body) = post(apiKey, model, request(userText, withSchema = true))
        // Fall back to prompt-described JSON if this model/endpoint rejects responseJsonSchema.
        val (finalCode, finalBody) = if (code == 400 && body.contains("responseJsonSchema", ignoreCase = true)) {
            post(apiKey, model, request("$userText\n\nReply with JSON matching this schema:\n$SCHEMA", withSchema = false))
        } else code to body

        if (finalCode !in 200..299) throw ParseException(describeError(finalCode, finalBody, model))

        val root = JSONObject(finalBody)
        root.optJSONObject("promptFeedback")?.optString("blockReason")?.takeIf { it.isNotEmpty() }?.let {
            throw ParseException("Gemini blocked this request ($it).")
        }
        val candidate = root.optJSONArray("candidates")?.optJSONObject(0)
            ?: throw ParseException("Gemini returned no answer.")
        when (val reason = candidate.optString("finishReason")) {
            "", "STOP" -> Unit
            "MAX_TOKENS" -> throw ParseException("Response was cut off. Try a shorter recording.")
            else -> throw ParseException("Gemini stopped early ($reason).")
        }
        val parts = candidate.optJSONObject("content")?.optJSONArray("parts") ?: JSONArray()
        val text = (0 until parts.length())
            .map { parts.getJSONObject(it) }
            .filterNot { it.optBoolean("thought") }
            .joinToString("") { it.optString("text") }
            .trim()
            .removePrefix("```json").removePrefix("```").removeSuffix("```").trim()
        if (text.isBlank()) throw ParseException("Gemini returned no structured output.")
        try {
            toParsed(JSONObject(text))
        } catch (e: org.json.JSONException) {
            throw ParseException("Gemini's reply was not valid JSON.")
        }
    }

    private fun request(userText: String, withSchema: Boolean): JSONObject {
        val generation = JSONObject()
            .put("responseMimeType", "application/json")
            .put("temperature", 0)
        if (withSchema) generation.put("responseJsonSchema", SCHEMA)
        return JSONObject()
            .put("systemInstruction", JSONObject().put("parts", JSONArray().put(JSONObject().put("text", SYSTEM_PROMPT))))
            .put(
                "contents", JSONArray().put(
                    JSONObject().put("role", "user").put("parts", JSONArray().put(JSONObject().put("text", userText)))
                )
            )
            .put("generationConfig", generation)
    }

    private fun post(apiKey: String, model: String, payload: JSONObject): Pair<Int, String> {
        val url = URL("$BASE/${URLEncoder.encode(model.trim(), "UTF-8")}:generateContent")
        val conn = url.openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 15_000
            conn.readTimeout = 60_000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            conn.setRequestProperty("x-goog-api-key", apiKey.trim())
            conn.outputStream.use { it.write(payload.toString().toByteArray()) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            code to (stream?.bufferedReader()?.use { it.readText() } ?: "")
        } catch (e: IOException) {
            throw ParseException("Could not reach Gemini: ${e.message ?: e.javaClass.simpleName}")
        } finally {
            conn.disconnect()
        }
    }

    private fun describeError(code: Int, body: String, model: String): String {
        val msg = runCatching { JSONObject(body).getJSONObject("error").getString("message") }.getOrNull()
        return when {
            code == 400 && (msg?.contains("API key", true) == true) -> "API key rejected. Check it in the Profile tab."
            code == 401 || code == 403 -> "API key not allowed to use Gemini. Check it in the Profile tab."
            code == 404 -> "Model \"$model\" not found. Change it in the Profile tab."
            code == 429 -> "Gemini rate limit or quota reached. Try again in a moment."
            else -> "Gemini API error $code${msg?.let { ": $it" } ?: ""}"
        }
    }

    private fun JSONObject.str(key: String): String? =
        if (isNull(key)) null else optString(key).trim().ifEmpty { null }

    private fun JSONObject.list(key: String): List<String> {
        val arr = optJSONArray(key) ?: return emptyList()
        return (0 until arr.length()).map { arr.getString(it) }
    }

    private fun toParsed(o: JSONObject) = ParsedLog(
        action = when (o.str("action")) {
            "book" -> LogAction.BOOK
            "return" -> LogAction.RETURN
            "repair" -> LogAction.REPAIR
            else -> null
        },
        equipmentId = o.str("equipment_id")?.filter { it.isDigit() }?.ifEmpty { null },
        equipmentType = o.str("equipment_type"),
        patientId = o.str("patient_id")?.uppercase(),
        bed = o.str("bed")?.uppercase()?.removePrefix("BED ")?.trim(),
        durationHours = if (o.isNull("duration_hours")) null else o.optInt("duration_hours"),
        durationLabel = o.str("duration_label"),
        corrections = o.list("corrections"),
        ignored = o.list("ignored"),
        clarification = o.str("clarification"),
        confidence = o.str("confidence") ?: "low",
        summary = o.str("summary") ?: "",
    )
}
