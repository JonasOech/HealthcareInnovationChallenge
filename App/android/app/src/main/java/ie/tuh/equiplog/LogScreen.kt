package ie.tuh.equiplog

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.outlined.VolumeOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun LogScreen(onLogged: (Pair<String, String>) -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val speech = remember { SpeechController(ctx) }
    DisposableEffect(Unit) { onDispose { speech.release() } }

    var action by rememberSaveable { mutableStateOf(LogAction.BOOK) }
    var equipText by rememberSaveable { mutableStateOf("") }
    var patientText by rememberSaveable { mutableStateOf("") }
    var duration by rememberSaveable { mutableStateOf<String?>(null) }
    var customDuration by rememberSaveable { mutableStateOf("") }
    var parsing by remember { mutableStateOf(false) }
    var parsed by remember { mutableStateOf<ParsedLog?>(null) }
    var parseError by remember { mutableStateOf<String?>(null) }
    var aiFilled by remember { mutableStateOf(setOf<String>()) }
    var spokenType by remember { mutableStateOf<String?>(null) }
    var spokenBed by remember { mutableStateOf<String?>(null) }
    var customHours by remember { mutableStateOf<Int?>(null) }

    fun runParse(text: String) {
        val key = Prefs.apiKey(ctx)
        if (text.isBlank()) return
        if (key.isBlank()) {
            parseError = "Add your Gemini API key in the Profile tab first."
            return
        }
        parsing = true
        parseError = null
        scope.launch {
            try {
                val p = GeminiParser.parse(key, Prefs.model(ctx), text)
                parsed = p
                spokenType = p.equipmentType
                spokenBed = p.bed
                val filled = mutableSetOf<String>()
                p.action?.let { action = it; filled += "action" }
                p.equipmentId?.let { equipText = formatEquipId(it); filled += "equip" }
                val patient = AppStore.findPatient(p.patientId) ?: AppStore.findPatientByBed(p.bed)
                when {
                    patient != null -> { patientText = patient.id; filled += "patient" }
                    p.patientId != null -> { patientText = p.patientId; filled += "patient" }
                    p.bed != null -> { patientText = "Bed ${p.bed}"; filled += "patient" }
                }
                if (p.durationHours != null || p.durationLabel != null) {
                    val chip = DURATIONS.firstOrNull { it.hours == p.durationHours }
                    if (chip != null) duration = chip.label
                    else { duration = "Custom"; customDuration = p.durationLabel ?: "${p.durationHours} hrs"; customHours = p.durationHours }
                    filled += "duration"
                }
                aiFilled = filled
            } catch (e: ParseException) {
                parseError = e.message
            } catch (e: Exception) {
                parseError = "Unexpected parser error: ${e.message}"
            } finally {
                parsing = false
            }
        }
    }

    // After granting, the user simply presses and holds again.
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}

    /** Press-and-hold: returns false if recording could not start (e.g. permission prompt shown). */
    fun startHold(append: Boolean): Boolean {
        if (parsing) return false
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permission.launch(Manifest.permission.RECORD_AUDIO)
            return false
        }
        if (!append) parsed = null
        parseError = null
        speech.start(append)
        return true
    }

    fun endHold() {
        if (!speech.listening) return
        speech.stop()
        scope.launch {
            delay(700) // let the recognizer deliver its final segment
            runParse(speech.transcript)
        }
    }

    val equipId = equipText.filter { it.isDigit() }
    val equipment = AppStore.findEquipment(equipId)
    // Demo: unknown IDs are accepted; known ones just get their roster details shown.
    val patient = AppStore.findPatient(patientText) ?: AppStore.findPatientByBed(patientText)
    val durationLabel = if (duration == "Custom") customDuration.trim() else duration
    val durationHours = if (duration == "Custom") customHours else DURATIONS.firstOrNull { it.label == duration }?.hours
    val canConfirm = equipId.isNotEmpty() && when (action) {
        LogAction.BOOK -> patientText.isNotBlank() && !durationLabel.isNullOrBlank()
        else -> true
    }

    Column(
        Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Voice card
        Card {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                MicButton(listening = speech.listening, level = speech.level, onPress = { startHold(append = false) }, onRelease = ::endHold)
                Spacer(Modifier.height(8.dp))
                Text(
                    if (speech.listening) "Listening… release to finish" else "Hold to Speak Booking",
                    fontSize = 20.sp, fontWeight = FontWeight.Bold, color = C.onSurface,
                )
                Text(
                    "eg. \"Book Wheelchair 4829-1053 to the patient in Bed 4B-12 for the next 3 weeks\"",
                    fontSize = 14.sp, color = C.onSurfaceVariant, textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            if (speech.listening || speech.transcript.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Label("Transcript", Icons.Outlined.EditNote)
                OutlinedTextField(
                    value = speech.transcript,
                    onValueChange = { speech.setText(it) },
                    readOnly = speech.listening,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 90.dp),
                    textStyle = androidx.compose.ui.text.TextStyle(fontSize = 15.sp, color = C.onSurface),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = C.ai, unfocusedBorderColor = if (speech.listening) C.ai else C.outlineVariant,
                        focusedContainerColor = Color(0xFFFAFAFE), unfocusedContainerColor = Color(0xFFFAFAFE),
                    ),
                )
                run {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { runParse(speech.transcript) },
                            enabled = !parsing && !speech.listening && speech.transcript.isNotBlank(),
                            colors = ButtonDefaults.buttonColors(containerColor = C.ai),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Filled.AutoAwesome, null, Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Re-parse")
                        }
                        Row(
                            Modifier.weight(1f).height(40.dp).clip(RoundedCornerShape(8.dp))
                                .border(1.dp, C.outlineVariant, RoundedCornerShape(8.dp))
                                .holdToTalk(onPress = { startHold(append = true) }, onRelease = ::endHold),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Filled.Mic, null, Modifier.size(18.dp), tint = C.primary)
                            Spacer(Modifier.width(6.dp))
                            Text("Hold to add", color = C.primary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        }
                    }
                }
            }

            speech.error?.let { Notice(it, Icons.Outlined.VolumeOff, C.warnBg, C.warnText) }
        }

        // AI result
        if (parsing) {
            Card(border = BorderStroke(2.dp, C.ai.copy(alpha = 0.35f))) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(Modifier.size(22.dp), color = C.ai, strokeWidth = 3.dp)
                    Spacer(Modifier.width(12.dp))
                    Text("Gemini is untangling the request…", color = C.aiText, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        parseError?.let { Notice(it, Icons.Outlined.ErrorOutline, C.critBg, C.critText) }
        parsed?.let { p -> if (!parsing) ParsedCard(p) }

        Row(verticalAlignment = Alignment.CenterVertically) {
            HorizontalDivider(Modifier.weight(1f), color = C.containerHigh)
            Text("OR EDIT", Modifier.padding(horizontal = 12.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = C.onSurfaceVariant)
            HorizontalDivider(Modifier.weight(1f), color = C.containerHigh)
        }

        // Form
        Card {
            Segmented(LogAction.entries, action, { it.label }, ai = "action" in aiFilled) {
                action = it; aiFilled = aiFilled - "action"
            }

            Field(
                label = "Equipment ID (HC21)", ai = "equip" in aiFilled,
                badge = if (equipment != null) Triple("Verified", C.okBg, C.okText) else null,
                highlighted = true,
            ) {
                OutlinedTextField(
                    value = equipText,
                    onValueChange = { v -> equipText = v.filter { it.isDigit() || it == ' ' }.take(14); aiFilled = aiFilled - "equip" },
                    placeholder = { Text("HC21 number") },
                    prefix = { Text("# ", color = C.primary, fontWeight = FontWeight.Bold) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    textStyle = androidx.compose.ui.text.TextStyle(
                        fontSize = 22.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, letterSpacing = 3.sp,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = fieldColors(),
                )
                equipment?.let {
                    val st = AppStore.statusOf(it)
                    InfoRow(it.type, st.label, statusColors(st))
                }
            }

            if (action == LogAction.BOOK) {
                Field(
                    label = "Patient ID & Location", ai = "patient" in aiFilled,
                ) {
                    OutlinedTextField(
                        value = patientText,
                        onValueChange = { patientText = it; aiFilled = aiFilled - "patient" },
                        placeholder = { Text("PT-xxxxx or bed") },
                        leadingIcon = { Icon(Icons.Outlined.Person, null, tint = C.primary) },
                        trailingIcon = { if (patient != null) Icon(Icons.Filled.CheckCircle, null, tint = C.primary) },
                        singleLine = true,
                        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Bold),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = fieldColors(),
                    )
                    patient?.let { InfoRow("${it.id} • ${it.ward}", "Bed ${it.bed}", C.primary.copy(alpha = 0.1f) to C.primary) }
                }

                Field(label = "Booking Duration", icon = Icons.Outlined.Schedule, ai = "duration" in aiFilled) {
                    val options = DURATIONS.map { it.label } + "Custom"
                    options.chunked(3).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEach { label ->
                                DurationChip(
                                    label = if (label == "Custom" && duration == "Custom" && customDuration.isNotBlank()) customDuration else label,
                                    selected = duration == label,
                                    icon = if (label == "Custom") Icons.Outlined.Tune else null,
                                    modifier = Modifier.weight(1f),
                                ) { duration = label; aiFilled = aiFilled - "duration" }
                            }
                        }
                    }
                    if (duration == "Custom") {
                        OutlinedTextField(
                            value = customDuration, onValueChange = { customDuration = it; customHours = null },
                            placeholder = { Text("e.g. 2 days, until Friday") }, singleLine = true,
                            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), colors = fieldColors(),
                        )
                    }
                }
            }

            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(C.containerLow).padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(AppStore.nurseName.value, fontSize = 12.sp, color = C.onSurfaceVariant)
                Text(AppStore.ward.value, fontSize = 12.sp, color = C.onSurfaceVariant)
            }
        }

        if (action == LogAction.BOOK && equipment != null && equipment.status != EquipStatus.AVAILABLE) {
            Notice(
                "This item is ${AppStore.statusOf(equipment).label.lowercase()} (${equipment.location}). Confirming adds the patient to the waitlist.",
                Icons.Outlined.HelpOutline, C.warnBg, C.warnText,
            )
        }

        Button(
            onClick = {
                onLogged(AppStore.apply(action, equipId, spokenType, patient ?: AppStore.resolvePatient(patientText, spokenBed), durationLabel ?: "", durationHours))
                equipText = ""; patientText = ""; duration = null; customDuration = ""
                parsed = null; aiFilled = emptySet(); speech.setText(""); spokenType = null; spokenBed = null; customHours = null
            },
            enabled = canConfirm,
            modifier = Modifier.fillMaxWidth().height(64.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = C.primary),
        ) {
            Icon(Icons.Filled.CheckCircle, null, Modifier.size(26.dp))
            Spacer(Modifier.width(8.dp))
            Text("Confirm ${action.label}", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun ParsedCard(p: ParsedLog) {
    Card(border = BorderStroke(2.dp, C.ai.copy(alpha = 0.35f))) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.AutoAwesome, null, tint = C.ai, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("AI parsed", fontWeight = FontWeight.Bold, color = C.aiText, modifier = Modifier.weight(1f))
            val (bg, fg) = when (p.confidence) {
                "high" -> C.okBg to C.okText
                "medium" -> C.warnBg to C.warnText
                else -> C.critBg to C.critText
            }
            Pill("${p.confidence.replaceFirstChar { it.uppercase() }} confidence", bg, fg)
        }
        if (p.summary.isNotBlank()) Text(p.summary, fontSize = 15.sp, color = C.onSurface)
        if (p.corrections.isNotEmpty()) {
            Label("Self-corrections resolved", null)
            p.corrections.forEach { Bullet(it, C.ai) }
        }
        if (p.ignored.isNotEmpty()) {
            Label("Ignored (not part of this request)", null)
            p.ignored.forEach { Bullet(it, C.onSurfaceVariant, italic = true) }
        }
        p.clarification?.let { Notice(it, Icons.Outlined.HelpOutline, C.warnBg, C.warnText) }
    }
}

/** Calls [onPress] when a finger goes down and [onRelease] when it lifts (or the gesture is cancelled). */
@Composable
private fun Modifier.holdToTalk(onPress: () -> Boolean, onRelease: () -> Unit): Modifier {
    val press by rememberUpdatedState(onPress)
    val release by rememberUpdatedState(onRelease)
    return pointerInput(Unit) {
        detectTapGestures(onPress = {
            if (press()) {
                tryAwaitRelease()
                release()
            }
        })
    }
}

@Composable
private fun MicButton(listening: Boolean, level: Float, onPress: () -> Boolean, onRelease: () -> Unit) {
    val pulse = rememberInfiniteTransition(label = "pulse")
    val ring by pulse.animateFloat(1f, 1.25f, infiniteRepeatable(tween(1100), RepeatMode.Reverse), label = "ring")
    val color = if (listening) C.record else C.primary
    Box(Modifier.size(120.dp), contentAlignment = Alignment.Center) {
        Box(Modifier.size(96.dp).scale(if (listening) 1f + level * 0.3f else ring).clip(CircleShape).background(color.copy(alpha = 0.12f)))
        Box(Modifier.size(84.dp).clip(CircleShape).background(color.copy(alpha = 0.2f)))
        Box(
            Modifier.size(76.dp).clip(CircleShape).background(color).holdToTalk(onPress, onRelease),
            contentAlignment = Alignment.Center,
        ) {
            Icon(if (listening) Icons.Filled.Stop else Icons.Filled.Mic, "Dictate", tint = Color.White, modifier = Modifier.size(36.dp))
        }
    }
}

@Composable
fun Card(border: BorderStroke? = null, background: Color = C.card, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        Modifier.fillMaxWidth().clip(shape).background(background)
            .then(if (border != null) Modifier.border(border, shape) else Modifier.border(1.dp, Color(0xFFE2E8F0), shape))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        content = content,
    )
}

@Composable
private fun Field(
    label: String,
    ai: Boolean,
    badge: Triple<String, Color, Color>? = null,
    icon: ImageVector? = null,
    highlighted: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(12.dp)
    Column(
        Modifier.fillMaxWidth().clip(shape).background(C.containerLow)
            .then(
                when {
                    ai -> Modifier.border(2.dp, C.ai.copy(alpha = 0.5f), shape)
                    highlighted -> Modifier.border(2.dp, C.primary.copy(alpha = 0.2f), shape)
                    else -> Modifier
                }
            )
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { Label(label, icon) }
            if (ai) { Pill("AI", C.aiBg, C.aiText); Spacer(Modifier.width(6.dp)) }
            badge?.let { (t, bg, fg) -> Pill(t, bg, fg) }
        }
        content()
    }
}

@Composable
fun Label(text: String, icon: ImageVector?) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        icon?.let { Icon(it, null, tint = C.primary, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)) }
        Text(text.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp, color = C.onSurfaceVariant)
    }
}

@Composable
fun Pill(text: String, bg: Color, fg: Color, modifier: Modifier = Modifier) {
    Box(modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 10.dp, vertical = 5.dp), contentAlignment = Alignment.Center) {
        Text(text, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = fg, maxLines = 1)
    }
}

@Composable
fun Notice(text: String, icon: ImageVector, bg: Color, fg: Color) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(bg).padding(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(icon, null, tint = fg, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(text, color = fg, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun Bullet(text: String, color: Color, italic: Boolean = false) {
    Row {
        Text("•", color = color, fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 8.dp))
        Text(text, color = C.onSurface, fontSize = 14.sp, fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal)
    }
}

@Composable
private fun InfoRow(left: String, right: String, rightColors: Pair<Color, Color>) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(C.card).padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(left, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = C.onSurface, modifier = Modifier.weight(1f))
        Pill(right, rightColors.first, rightColors.second)
    }
}

@Composable
private fun <T> Segmented(options: List<T>, selected: T, label: (T) -> String, ai: Boolean, onSelect: (T) -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Color(0xFFF1F5F9))
            .then(if (ai) Modifier.border(2.dp, C.ai.copy(alpha = 0.5f), RoundedCornerShape(50)) else Modifier)
            .padding(4.dp),
    ) {
        options.forEach { o ->
            val sel = o == selected
            Box(
                Modifier.weight(1f).clip(RoundedCornerShape(50)).background(if (sel) Color.White else Color.Transparent)
                    .clickable { onSelect(o) }.padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(label(o), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (sel) C.onSurface else C.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun DurationChip(label: String, selected: Boolean, icon: ImageVector?, modifier: Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(8.dp)
    Row(
        modifier.height(44.dp).clip(shape).background(if (selected) C.primary else C.card)
            .border(1.dp, if (selected) C.primary else C.outlineVariant.copy(alpha = 0.5f), shape)
            .clickable(onClick = onClick),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val fg = if (selected) Color.White else C.onSurface
        (if (selected) Icons.Filled.Check else icon)?.let { Icon(it, null, tint = fg, modifier = Modifier.size(14.dp)); Spacer(Modifier.width(4.dp)) }
        Text(label, color = fg, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1)
    }
}

@Composable
fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = C.primary,
    unfocusedBorderColor = C.outlineVariant.copy(alpha = 0.6f),
    focusedContainerColor = C.card,
    unfocusedContainerColor = C.card,
)

fun statusColors(s: EquipStatus): Pair<Color, Color> = when (s) {
    EquipStatus.AVAILABLE -> Color(0xFFECFDF5) to Color(0xFF065F46)
    EquipStatus.ON_LOAN -> C.aiBg to C.aiText
    EquipStatus.REPAIR -> C.warnBg to C.warnText
    EquipStatus.MISSING -> C.critBg to C.critText
    EquipStatus.LATE -> C.record to Color.White
}

@Composable
fun Toast(msg: Pair<String, String>?, onDismiss: () -> Unit) {
    LaunchedEffect(msg) { if (msg != null) { delay(4000); onDismiss() } }
    AnimatedVisibility(
        visible = msg != null,
        enter = fadeIn() + slideInVertically(),
        exit = fadeOut() + slideOutVertically(),
    ) {
        val m = msg ?: return@AnimatedVisibility
        Row(
            Modifier.padding(16.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(C.inverse).padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(32.dp).clip(CircleShape).background(C.primaryContainer), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.DoneAll, null, tint = Color.White, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(m.first, color = C.onInverse, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text(m.second, color = C.onInverse.copy(alpha = 0.8f), fontSize = 12.sp)
            }
            IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, "Close", tint = C.onInverse) }
        }
    }
}
