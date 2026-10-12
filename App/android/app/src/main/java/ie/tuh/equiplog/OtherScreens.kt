package ie.tuh.equiplog

import android.text.format.DateUtils
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.delay
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Build
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.RecordVoiceOver
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Undo
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

private fun ago(t: Long) = DateUtils.getRelativeTimeSpanString(t, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS).toString()

@Composable
private fun SectionTitle(text: String) {
    Text(text, fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = C.onSurface, modifier = Modifier.padding(top = 4.dp))
}

@Composable
fun BookingsScreen(onLogged: (Pair<String, String>) -> Unit, focusEquipmentId: String?, onFocusShown: () -> Unit) {
    val listState = rememberLazyListState()
    val bookings = AppStore.bookings.sortedByDescending { it.isLate() }
    var highlighted by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(focusEquipmentId) {
        val id = focusEquipmentId ?: return@LaunchedEffect
        val index = bookings.indexOfFirst { it.equipmentId == id }
        if (index >= 0) listState.animateScrollToItem(index + 1) // +1 for the section title
        highlighted = id
        delay(2500)
        highlighted = null
        onFocusShown() // clearing the focus restarts this effect, so do it last
    }
    LazyColumn(
        state = listState,
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { SectionTitle("Active bookings (${AppStore.bookings.size})") }
        if (AppStore.bookings.isEmpty()) item { Text("No equipment is on loan.", color = C.onSurfaceVariant) }
        items(bookings, key = { it.equipmentId + it.bookedAt }) { b ->
            val e = AppStore.findEquipment(b.equipmentId)
            val late = b.isLate()
            Card(
                border = when {
                    highlighted == b.equipmentId -> BorderStroke(3.dp, if (late) C.record else C.primary)
                    late -> BorderStroke(2.dp, C.record)
                    else -> null
                },
                background = if (late) C.critBg else C.card,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(e?.type ?: "Unknown item", fontWeight = FontWeight.Bold, color = C.onSurface)
                        Text("#${formatEquipId(b.equipmentId)}", fontFamily = FontFamily.Monospace, color = C.onSurfaceVariant, fontSize = 13.sp)
                    }
                    if (late) { Pill("Late", C.record, Color.White); Spacer(Modifier.width(6.dp)) }
                    Pill("Bed ${b.bed}", C.primary.copy(alpha = 0.1f), C.primary)
                }
                Text("${b.patientId} • ${b.durationLabel} • by ${b.bookedBy} • ${ago(b.bookedAt)}", fontSize = 12.sp, color = C.onSurfaceVariant)
                b.dueAt?.let { due ->
                    Text(
                        if (late) "Overdue — was due ${ago(due)}" else "Due ${ago(due)}",
                        fontSize = 12.sp, fontWeight = if (late) FontWeight.Bold else FontWeight.Normal,
                        color = if (late) C.critText else C.onSurfaceVariant,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { onLogged(AppStore.apply(LogAction.RETURN, b.equipmentId, null, null, "")) },
                        colors = ButtonDefaults.buttonColors(containerColor = C.primary),
                        shape = RoundedCornerShape(8.dp), modifier = Modifier.weight(1f),
                    ) { Icon(Icons.Outlined.Undo, null); Spacer(Modifier.width(6.dp)); Text("Return") }
                    OutlinedButton(
                        onClick = { onLogged(AppStore.apply(LogAction.REPAIR, b.equipmentId, null, null, "")) },
                        shape = RoundedCornerShape(8.dp), modifier = Modifier.weight(1f),
                    ) { Icon(Icons.Outlined.Build, null); Spacer(Modifier.width(6.dp)); Text("Repair") }
                }
            }
        }
        item { SectionTitle("Waitlist (${AppStore.waitlist.size})") }
        if (AppStore.waitlist.isEmpty()) item {
            Text("Nobody is waiting. Booking an item that is on loan or in repair adds the patient here.", color = C.onSurfaceVariant, fontSize = 13.sp)
        }
        items(AppStore.waitlist.toList(), key = { it.patientId + it.addedAt }) { w ->
            Card {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(w.equipmentType, fontWeight = FontWeight.Bold, color = C.onSurface)
                        Text("${w.patientId} • added ${ago(w.addedAt)}", fontSize = 12.sp, color = C.onSurfaceVariant)
                    }
                    Pill("Bed ${w.bed}", C.warnBg, C.warnText)
                }
            }
        }
    }
}

@Composable
fun RosterScreen(onOpenBooking: (String) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf<EquipStatus?>(null) }
    var category by rememberSaveable { mutableStateOf<String?>(null) }
    val categories = AppStore.equipment.map { it.category }.distinct()
    val list = AppStore.equipment.filter { e ->
        (filter == null || AppStore.statusOf(e) == filter) &&
            (category == null || e.category == category) &&
            (query.isBlank() || listOf(e.id, e.type, e.category, e.location).any { it.contains(query.replace(" ", ""), true) || it.contains(query, true) })
    }.sortedByDescending { AppStore.statusOf(it) == EquipStatus.LATE } // late items first
    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            OutlinedTextField(
                value = query, onValueChange = { query = it },
                placeholder = { Text("Search ID, type, location") },
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), colors = fieldColors(),
            )
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    FilterChip(filter == null, { filter = null }, { Text("All ${AppStore.equipment.size}") },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = C.container))
                }
                items(EquipStatus.entries.sortedByDescending { it == EquipStatus.LATE }) { s ->
                    val late = s == EquipStatus.LATE
                    FilterChip(filter == s, { filter = if (filter == s) null else s },
                        { Text("${s.label} ${AppStore.equipment.count { AppStore.statusOf(it) == s }}") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = if (late) C.record else C.container,
                            selectedLabelColor = if (late) Color.White else C.onSurface,
                            labelColor = if (late) C.critText else C.onSurfaceVariant,
                        ))
                }
            }
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    FilterChip(category == null, { category = null }, { Text("All types") },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = C.container))
                }
                items(categories) { c ->
                    FilterChip(category == c, { category = if (category == c) null else c },
                        { Text("$c ${AppStore.equipment.count { it.category == c }}") },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = C.container))
                }
            }
        }
        if (list.isEmpty()) item { Text("No equipment matches these filters.", color = C.onSurfaceVariant) }
        items(list, key = { it.id }) { e ->
            val booked = AppStore.bookings.any { it.equipmentId == e.id }
            val status = AppStore.statusOf(e)
            val late = status == EquipStatus.LATE
            Box(Modifier.clip(RoundedCornerShape(16.dp)).then(if (booked) Modifier.clickable { onOpenBooking(e.id) } else Modifier)) {
                Card(border = if (late) BorderStroke(2.dp, C.record) else null, background = if (late) C.critBg else C.card) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(e.type, fontWeight = FontWeight.Bold, color = C.onSurface)
                            Text("#${formatEquipId(e.id)} • ${e.category}", fontSize = 12.sp, color = C.onSurfaceVariant, fontFamily = FontFamily.Monospace)
                            Text(e.location, fontSize = 12.sp, color = C.onSurfaceVariant)
                            if (late) AppStore.bookingFor(e.id)?.dueAt?.let {
                                Text("Overdue — was due ${ago(it)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = C.critText)
                            }
                        }
                        val (bg, fg) = statusColors(status)
                        Pill(status.label, bg, fg)
                        if (booked) Icon(Icons.Outlined.ChevronRight, "View booking", tint = C.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileScreen() {
    val ctx = LocalContext.current
    var key by remember { mutableStateOf(Prefs.apiKey(ctx)) }
    var model by remember { mutableStateOf(Prefs.model(ctx)) }
    var show by remember { mutableStateOf(false) }
    var saved by remember { mutableStateOf(false) }

    Column(
        Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        SectionTitle("Profile")
        Card {
            Label("Staff member", null)
            OutlinedTextField(AppStore.nurseName.value, { AppStore.nurseName.value = it }, singleLine = true,
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), colors = fieldColors())
            Label("Ward", null)
            OutlinedTextField(AppStore.ward.value, { AppStore.ward.value = it }, singleLine = true,
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), colors = fieldColors())
        }
        Card {
            Label("Gemini API key", Icons.Outlined.Key)
            OutlinedTextField(
                value = key, onValueChange = { key = it; saved = false },
                placeholder = { Text("AIza…") }, singleLine = true,
                visualTransformation = if (show) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                trailingIcon = {
                    IconButton({ show = !show }) { Icon(if (show) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, "Show key") }
                },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), colors = fieldColors(),
            )
            Label("Model", null)
            OutlinedTextField(
                value = model, onValueChange = { model = it; saved = false },
                placeholder = { Text(GeminiParser.DEFAULT_MODEL) }, singleLine = true,
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), colors = fieldColors(),
            )
            Button(
                onClick = { Prefs.setApiKey(ctx, key); Prefs.setModel(ctx, model); saved = true },
                colors = ButtonDefaults.buttonColors(containerColor = C.primary), shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (saved) "Saved" else "Save") }
            Text("Stored only on this device. Get a free key at aistudio.google.com/apikey.", fontSize = 12.sp, color = C.onSurfaceVariant)
        }
        ScriptCard(ctx)
        Card {
            Label("Demo data", Icons.Outlined.Info)
            Text(
                "Everything is kept in memory: ${AppStore.equipment.size} items, ${AppStore.patients.size} patients, " +
                    "${AppStore.bookings.size} bookings. Patients are identified by ID and bed only.",
                fontSize = 13.sp, color = C.onSurfaceVariant,
            )
            OutlinedButton({ AppStore.reset() }, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Text("Reset demo data")
            }
        }
    }
}

/**
 * Loud-room demo mode: instead of listening, holding the mic types out this script at the chosen
 * tempo. Everything downstream (Gemini parsing, the form, the confirm) is unchanged.
 */
@Composable
private fun ScriptCard(ctx: android.content.Context) {
    var on by remember { mutableStateOf(Prefs.scriptEnabled(ctx)) }
    var text by remember { mutableStateOf(Prefs.scriptText(ctx)) }
    var wpm by remember { mutableIntStateOf(Prefs.scriptWpm(ctx)) }

    val words = text.trim().split(Regex("\\s+")).count { it.isNotBlank() }
    val seconds = if (wpm > 0) words * 60.0 / wpm else 0.0

    Card(border = if (on) BorderStroke(2.dp, C.ai.copy(alpha = 0.35f)) else null) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.RecordVoiceOver, null, tint = C.ai, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text("Scripted transcript", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = C.onSurface)
                Text("For demos in a room too loud to dictate in", fontSize = 12.sp, color = C.onSurfaceVariant)
            }
            Switch(
                checked = on,
                onCheckedChange = { on = it; Prefs.setScriptEnabled(ctx, it) },
                colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = C.ai),
            )
        }
        Text(
            "While this is on, holding the mic types the text below out word by word instead of opening " +
                "the microphone. Releasing early still sends the full script, so the parse always lands.",
            fontSize = 12.sp, color = C.onSurfaceVariant,
        )

        Label("Detected text", null)
        OutlinedTextField(
            value = text,
            onValueChange = { text = it; Prefs.setScriptText(ctx, it) },
            placeholder = { Text("What the mic should \"hear\"") },
            modifier = Modifier.fillMaxWidth().heightIn(min = 150.dp),
            shape = RoundedCornerShape(8.dp),
            colors = fieldColors(),
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { Label("Tempo", Icons.Outlined.Speed) }
            Text("$wpm words/min", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = C.ai)
        }
        Slider(
            value = wpm.toFloat(),
            onValueChange = { wpm = (it / 10).roundToInt() * 10 },
            onValueChangeFinished = { Prefs.setScriptWpm(ctx, wpm) },
            valueRange = SpeechController.MIN_WPM.toFloat()..SpeechController.MAX_WPM.toFloat(),
            colors = SliderDefaults.colors(thumbColor = C.ai, activeTrackColor = C.ai, inactiveTrackColor = C.containerHigh),
        )
        Text(
            "$words words • about ${"%.1f".format(seconds)}s to type out. " +
                "Hold the mic for at least that long to keep it in step with what you say out loud.",
            fontSize = 12.sp, color = C.onSurfaceVariant,
        )
        OutlinedButton(
            { text = SpeechController.DEFAULT_SCRIPT; Prefs.setScriptText(ctx, text) },
            shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth(),
        ) { Text("Restore example script") }
    }
}
