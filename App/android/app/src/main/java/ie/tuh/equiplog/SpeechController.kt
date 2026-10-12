package ie.tuh.equiplog

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.random.Random

/**
 * Wraps Android's SpeechRecognizer for long, rambling dictation. The platform recognizer stops
 * after a short pause, so while the user hasn't tapped "stop" we restart it and keep appending
 * segments. The whole transcript (including corrections) goes to Gemini in one piece.
 *
 * On-stage fallback: when the scripted transcript is switched on in the Profile tab (see [Prefs]),
 * holding the mic types out a fixed script instead of listening, so the demo survives a room too
 * loud for the recognizer. Parsing itself is untouched — the script still goes to Gemini.
 */
class SpeechController(private val context: Context) {
    var listening by mutableStateOf(false); private set
    var committed by mutableStateOf(""); private set
    var partial by mutableStateOf(""); private set
    var level by mutableStateOf(0f); private set
    var error by mutableStateOf<String?>(null); private set

    val transcript: String get() = listOf(committed, partial).filter { it.isNotBlank() }.joinToString(" ")

    private var recognizer: SpeechRecognizer? = null

    private val scope = CoroutineScope(Dispatchers.Main.immediate)
    private var script: Job? = null
    /** Words of the script not yet "heard", flushed on release so a short hold still parses. */
    private var scriptRest: List<String> = emptyList()

    val available: Boolean get() = SpeechRecognizer.isRecognitionAvailable(context)

    /** True when holding the mic will type out the script instead of opening the microphone. */
    val willScript: Boolean get() = Prefs.scriptEnabled(context) && Prefs.scriptText(context).isNotBlank()

    /** True while the current session is a scripted one; its transcript is complete as soon as [stop] returns. */
    var usingScript by mutableStateOf(false); private set

    fun setText(text: String) {
        committed = text
        partial = ""
    }

    fun start(append: Boolean) {
        error = null
        if (willScript) {
            startScripted(append)
            return
        }
        if (!available) {
            error = "No speech recognition service on this device. Type the request instead."
            return
        }
        usingScript = false
        if (!append) setText("")
        listening = true
        launch()
    }

    fun stop() {
        listening = false
        if (usingScript) {
            stopScripted()
            return
        }
        // The final segment arrives via onResults/onError, which commit it; committing here too would duplicate it.
        recognizer?.stopListening()
        level = 0f
    }

    fun release() {
        listening = false
        script = null
        scope.cancel()
        recognizer?.destroy()
        recognizer = null
    }

    private fun commitPartial() {
        if (partial.isNotBlank()) {
            committed = listOf(committed, partial).filter { it.isNotBlank() }.joinToString(" ")
        }
        partial = ""
    }

    /**
     * Types the configured script into [partial] one word at a time at the configured tempo,
     * jittering [level] so the mic button still reacts as if it were hearing the room.
     */
    private fun startScripted(append: Boolean) {
        if (!append) setText("")
        usingScript = true
        listening = true
        val words = Prefs.scriptText(context).trim().split(Regex("\\s+")).filter { it.isNotBlank() }
        val perWord = (60_000L / Prefs.scriptWpm(context).coerceIn(MIN_WPM, MAX_WPM)).coerceAtLeast(16L)
        scriptRest = words
        script?.cancel()
        script = scope.launch {
            val spoken = StringBuilder()
            delay(minOf(perWord, 300L)) // the real recognizer also needs a beat before the first words land
            words.forEachIndexed { i, word ->
                if (spoken.isNotEmpty()) spoken.append(' ')
                spoken.append(word)
                partial = spoken.toString()
                scriptRest = words.drop(i + 1)
                waitJittering(perWord, 0.25f..1f)
            }
            // Script done but the mic is still held: idle quietly until release.
            while (isActive) waitJittering(240L, 0f..0.12f)
        }
    }

    private suspend fun waitJittering(millis: Long, amplitude: ClosedFloatingPointRange<Float>) {
        var left = millis
        while (left > 0) {
            level = Random.nextFloat() * (amplitude.endInclusive - amplitude.start) + amplitude.start
            val tick = minOf(80L, left)
            delay(tick)
            left -= tick
        }
    }

    private fun stopScripted() {
        script?.cancel()
        script = null
        level = 0f
        // Flush the words not reached yet, so releasing early still hands Gemini the whole request.
        val rest = scriptRest
        scriptRest = emptyList()
        if (rest.isNotEmpty()) {
            partial = listOf(partial, rest.joinToString(" ")).filter { it.isNotBlank() }.joinToString(" ")
        }
        commitPartial()
    }

    private fun launch() {
        val r = recognizer ?: SpeechRecognizer.createSpeechRecognizer(context).also {
            it.setRecognitionListener(listener)
            recognizer = it
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IE")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 4000L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
        }
        r.startListening(intent)
    }

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) { level = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f) }
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onEvent(eventType: Int, params: Bundle?) {}

        override fun onPartialResults(partialResults: Bundle?) {
            partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let {
                if (it.isNotBlank()) partial = it
            }
        }

        override fun onResults(results: Bundle?) {
            results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let {
                if (it.isNotBlank()) partial = it
            }
            commitPartial()
            if (listening) launch()
        }

        override fun onError(code: Int) {
            commitPartial()
            when (code) {
                // Silence or nothing recognised: keep going while the user is still "recording".
                SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> if (listening) launch()
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> if (listening) {
                    recognizer?.destroy(); recognizer = null; launch()
                }
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                    listening = false; error = "Microphone permission is needed for dictation."
                }
                SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> {
                    listening = false; error = "Speech recognition needs a network connection."
                }
                else -> if (listening) {
                    listening = false; error = "Speech recognition stopped (code $code). Tap the mic to continue."
                }
            }
            level = 0f
        }
    }

    companion object {
        const val DEFAULT_WPM = 150
        const val MIN_WPM = 40
        const val MAX_WPM = 400

        /** Shows off the parser: a self-correction on the HC21 number plus an aside to ignore. */
        const val DEFAULT_SCRIPT =
            "Right, I need to book the self-propel wheelchair, number 4829 1035 — ah no sorry, " +
                "4829 1053 — for the patient in bed 4B-12, and that's for about three weeks. " +
                "Oh and remind me to chase up the pressure cushion that went missing on Ward 3A."
    }
}
