package ie.tuh.equiplog

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.snapshots.SnapshotStateList

enum class EquipStatus(val label: String) {
    AVAILABLE("Available"),
    ON_LOAN("On loan"),
    REPAIR("Repair / service"),
    MISSING("Missing"),
    /** Never stored: derived for items whose booking has run past its duration. */
    LATE("Late"),
}

enum class LogAction(val label: String) { BOOK("Book"), RETURN("Return"), REPAIR("Repair") }

data class Equipment(
    val id: String,          // 8-digit HC21 number, digits only
    val type: String,
    val category: String,
    val status: EquipStatus,
    val location: String,
)

/** Only the MRN-style patient ID and bed are kept (no names), per the GDPR note in CLAUDE.md. */
data class Patient(val id: String, val bed: String, val ward: String)

data class Booking(
    val equipmentId: String,
    val patientId: String,
    val bed: String,
    val durationLabel: String,
    val bookedBy: String,
    val bookedAt: Long,
    val hours: Int? = null, // null when the duration couldn't be turned into hours
) {
    val dueAt: Long? get() = hours?.let { bookedAt + it * 3_600_000L }
    fun isLate(now: Long = System.currentTimeMillis()) = dueAt?.let { now > it } ?: false
}

data class WaitlistEntry(val equipmentType: String, val patientId: String, val bed: String, val addedAt: Long)

data class Duration(val label: String, val hours: Int)

val DURATIONS = listOf(
    Duration("5 hrs", 5),
    Duration("24 hrs", 24),
    Duration("3 days", 72),
    Duration("1 week", 168),
    Duration("3 weeks", 504),
)

fun formatEquipId(id: String): String =
    if (id.length == 8) "${id.substring(0, 4)} ${id.substring(4)}" else id

/** In-memory store standing in for the database. Resets when the app process dies. */
object AppStore {
    val nurseName = mutableStateOf("Sarah Jenkins, RN")
    val ward = mutableStateOf("Ward 4B")

    val equipment: SnapshotStateList<Equipment> = mutableStateListOf()
    val patients: List<Patient> = listOf(
        Patient("PT-90421", "4B-12", "Ward 4B"),
        Patient("PT-90433", "4B-07", "Ward 4B"),
        Patient("PT-88102", "4B-03", "Ward 4B"),
        Patient("PT-90417", "4B-14", "Ward 4B"),
        Patient("PT-91877", "3A-05", "Ward 3A"),
        Patient("PT-87650", "3A-11", "Ward 3A"),
    )
    val bookings: SnapshotStateList<Booking> = mutableStateListOf()
    val waitlist: SnapshotStateList<WaitlistEntry> = mutableStateListOf()

    init { reset() }

    fun reset() {
        equipment.clear()
        equipment.addAll(
            listOf(
                // Deliberately similar IDs so self-corrections in speech matter.
                Equipment("48291053", "Wheelchair (self-propel, 18\")", "Wheelchairs", EquipStatus.AVAILABLE, "OT Store"),
                Equipment("48291035", "Wheelchair (attendant, 16\")", "Wheelchairs", EquipStatus.AVAILABLE, "OT Store"),
                Equipment("48291089", "Tilt-in-space wheelchair", "Wheelchairs", EquipStatus.ON_LOAN, "Bed 4B-03"),
                Equipment("48291120", "Bariatric wheelchair", "Wheelchairs", EquipStatus.REPAIR, "Healthcare21 workshop"),
                Equipment("51020447", "Pressure cushion (gel)", "Pressure cushions", EquipStatus.AVAILABLE, "OT Store"),
                Equipment("51020474", "Pressure cushion (air)", "Pressure cushions", EquipStatus.ON_LOAN, "Bed 4B-07"),
                Equipment("51020512", "Pressure cushion (foam)", "Pressure cushions", EquipStatus.MISSING, "Last seen: Ward 3A"),
                Equipment("62310018", "Elevating leg rest (L)", "Leg rests", EquipStatus.AVAILABLE, "OT Store"),
                Equipment("62310019", "Elevating leg rest (R)", "Leg rests", EquipStatus.AVAILABLE, "OT Store"),
                Equipment("70455302", "Headrest (lateral support)", "Headrests", EquipStatus.AVAILABLE, "OT Store"),
                Equipment("81100231", "Residual limb board", "Residual limb boards", EquipStatus.AVAILABLE, "OT Store"),
                Equipment("90220077", "Sliding board (standard)", "Sliding boards", EquipStatus.AVAILABLE, "OT Store"),
                Equipment("90220078", "Sliding board (curved)", "Sliding boards", EquipStatus.ON_LOAN, "Bed 3A-11"),
            )
        )
        bookings.clear()
        val day = 86_400_000L
        val now = System.currentTimeMillis()
        bookings.add(Booking("48291089", "PT-88102", "4B-03", "1 week", "M. Byrne, OT", now - 2 * day, hours = 168))
        bookings.add(Booking("90220078", "PT-87650", "3A-11", "3 days", "G. Walsh, RN", now - day, hours = 72))
        // Example of an item that wasn't returned on time: 3-day loan booked 5 days ago.
        bookings.add(Booking("51020474", "PT-90433", "4B-07", "3 days", "S. Jenkins, RN", now - 5 * day, hours = 72))
        waitlist.clear()
    }

    fun bookingFor(equipId: String): Booking? = bookings.firstOrNull { it.equipmentId == equipId }

    /** Status as shown in the UI: an on-loan item past its due time is LATE. */
    fun statusOf(e: Equipment): EquipStatus =
        if (e.status == EquipStatus.ON_LOAN && bookingFor(e.id)?.isLate() == true) EquipStatus.LATE else e.status

    fun findEquipment(id: String?): Equipment? = id?.let { q -> equipment.firstOrNull { it.id == q } }
    fun findPatient(id: String?): Patient? =
        id?.let { q -> patients.firstOrNull { it.id.equals(q.trim(), ignoreCase = true) } }
    fun findPatientByBed(bed: String?): Patient? =
        bed?.let { q -> patients.firstOrNull { q.uppercase().contains(it.bed) } }

    private fun setStatus(id: String, status: EquipStatus, location: String) {
        val i = equipment.indexOfFirst { it.id == id }
        if (i >= 0) equipment[i] = equipment[i].copy(status = status, location = location)
    }

    /** Returns a human-readable outcome for the confirmation toast. */
    /** Demo leniency: an ID that isn't in the roster is added on the fly instead of being rejected. */
    fun findOrCreateEquipment(id: String, type: String?): Equipment =
        findEquipment(id) ?: Equipment(
            id = id,
            type = type?.replaceFirstChar { it.uppercase() } ?: "Equipment",
            category = "Other",
            status = EquipStatus.AVAILABLE,
            location = "OT Store",
        ).also { equipment.add(it) }

    /** Same leniency for patients: resolve by ID or bed, else take the typed text at face value. */
    fun resolvePatient(text: String, bed: String?): Patient {
        findPatient(text)?.let { return it }
        findPatientByBed(text)?.let { return it }
        findPatientByBed(bed)?.let { return it }
        val t = text.trim()
        val looksLikeBed = t.startsWith("bed", ignoreCase = true)
        val bedText = bed ?: if (looksLikeBed) t.substring(3).trim() else "—"
        return Patient(id = if (looksLikeBed || t.isEmpty()) "Unknown patient" else t.uppercase(), bed = bedText.uppercase(), ward = ward.value)
    }

    fun apply(
        action: LogAction, equipId: String, equipType: String?, patient: Patient?, durationLabel: String, hours: Int? = null,
    ): Pair<String, String> {
        val item = findOrCreateEquipment(equipId, equipType)
        val now = System.currentTimeMillis()
        return when (action) {
            LogAction.BOOK -> {
                requireNotNull(patient)
                if (item.status != EquipStatus.AVAILABLE) {
                    waitlist.add(WaitlistEntry(item.type, patient.id, patient.bed, now))
                    "Added to waitlist" to "${item.type} is ${item.status.label.lowercase()} • ${patient.id} queued"
                } else {
                    bookings.add(Booking(item.id, patient.id, patient.bed, durationLabel, nurseName.value, now, hours))
                    setStatus(item.id, EquipStatus.ON_LOAN, "Bed ${patient.bed}")
                    "HC21 (#${formatEquipId(item.id)}) Logged Successfully" to "Assigned to Bed ${patient.bed} • $durationLabel"
                }
            }
            LogAction.RETURN -> {
                bookings.removeAll { it.equipmentId == item.id }
                setStatus(item.id, EquipStatus.AVAILABLE, "OT Store")
                val next = waitlist.firstOrNull { it.equipmentType.substringBefore(" (") == item.type.substringBefore(" (") }
                "HC21 (#${formatEquipId(item.id)}) Returned" to
                    (next?.let { "Next on waitlist: ${it.patientId} (Bed ${it.bed}) notified" } ?: "Back in OT Store")
            }
            LogAction.REPAIR -> {
                bookings.removeAll { it.equipmentId == item.id }
                setStatus(item.id, EquipStatus.REPAIR, "Healthcare21 workshop")
                "HC21 (#${formatEquipId(item.id)}) Sent for repair" to "Healthcare21 notified"
            }
        }
    }
}
