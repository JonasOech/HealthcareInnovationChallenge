package ie.tuh.equiplog

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddCircle
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.EventAvailable
import androidx.compose.material.icons.outlined.MedicalServices
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object C {
    val primary = Color(0xFF00685F)
    val primaryContainer = Color(0xFF008378)
    val surface = Color(0xFFFAF8FF)
    val card = Color(0xFFFFFFFF)
    val containerLow = Color(0xFFF2F3FF)
    val container = Color(0xFFEAEDFF)
    val containerHigh = Color(0xFFE2E7FF)
    val onSurface = Color(0xFF131B2E)
    val onSurfaceVariant = Color(0xFF3D4947)
    val outlineVariant = Color(0xFFBCC9C6)
    val ai = Color(0xFF4648D4)
    val aiBg = Color(0xFFEEF2FF)
    val aiText = Color(0xFF3730A3)
    val record = Color(0xFFEF4444)
    val error = Color(0xFFBA1A1A)
    val okBg = Color(0xFF6DF5E1)
    val okText = Color(0xFF006F64)
    val warnBg = Color(0xFFFEF3C7)
    val warnText = Color(0xFF92400E)
    val critBg = Color(0xFFFEF2F2)
    val critText = Color(0xFF991B1B)
    val inverse = Color(0xFF283044)
    val onInverse = Color(0xFFEEF0FF)
}

object Prefs {
    private const val FILE = "equiplog"
    private fun prefs(ctx: Context) = ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun apiKey(ctx: Context): String =
        prefs(ctx).getString("gemini_api_key", null)?.ifBlank { null } ?: BuildConfig.DEFAULT_API_KEY

    fun setApiKey(ctx: Context, key: String) = prefs(ctx).edit().putString("gemini_api_key", key.trim()).apply()

    fun model(ctx: Context): String =
        prefs(ctx).getString("gemini_model", null)?.ifBlank { null } ?: GeminiParser.DEFAULT_MODEL

    fun setModel(ctx: Context, model: String) = prefs(ctx).edit().putString("gemini_model", model.trim()).apply()

    fun scriptEnabled(ctx: Context): Boolean = prefs(ctx).getBoolean("script_enabled", false)

    fun setScriptEnabled(ctx: Context, on: Boolean) = prefs(ctx).edit().putBoolean("script_enabled", on).apply()

    fun scriptText(ctx: Context): String =
        prefs(ctx).getString("script_text", null) ?: SpeechController.DEFAULT_SCRIPT

    fun setScriptText(ctx: Context, text: String) = prefs(ctx).edit().putString("script_text", text).apply()

    /** Dictation tempo of the scripted transcript, in words per minute. */
    fun scriptWpm(ctx: Context): Int = prefs(ctx).getInt("script_wpm", SpeechController.DEFAULT_WPM)

    fun setScriptWpm(ctx: Context, wpm: Int) = prefs(ctx).edit().putInt("script_wpm", wpm).apply()
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = lightColorScheme(
                    primary = C.primary,
                    onPrimary = Color.White,
                    primaryContainer = C.primaryContainer,
                    surface = C.surface,
                    background = C.surface,
                    onSurface = C.onSurface,
                    onSurfaceVariant = C.onSurfaceVariant,
                    outlineVariant = C.outlineVariant,
                    secondaryContainer = C.okBg,
                    tertiary = C.ai,
                    error = C.error,
                )
            ) { App() }
        }
    }
}

private data class Tab(val label: String, val icon: ImageVector)

private val TABS = listOf(
    Tab("Log Equip", Icons.Outlined.AddCircle),
    Tab("Bookings", Icons.Outlined.EventAvailable),
    Tab("Roster", Icons.Outlined.MedicalServices),
    Tab("Profile", Icons.Outlined.Badge),
)

@Composable
fun App() {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val toast = rememberSaveable { mutableStateOf<Pair<String, String>?>(null) }
    var focusBooking by rememberSaveable { mutableStateOf<String?>(null) }

    Scaffold(
        modifier = Modifier.systemBarsPadding(),
        containerColor = C.surface,
        topBar = { Header() },
        bottomBar = {
            NavigationBar(containerColor = C.surface, tonalElevation = 0.dp) {
                TABS.forEachIndexed { i, t ->
                    NavigationBarItem(
                        selected = tab == i,
                        onClick = { tab = i },
                        icon = { Icon(t.icon, contentDescription = t.label) },
                        label = { Text(t.label, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = C.primaryContainer,
                            selectedTextColor = C.primaryContainer,
                            indicatorColor = C.container,
                            unselectedIconColor = C.onSurfaceVariant,
                            unselectedTextColor = C.onSurfaceVariant,
                        ),
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when (tab) {
                0 -> LogScreen(onLogged = { toast.value = it })
                1 -> BookingsScreen(
                    onLogged = { toast.value = it },
                    focusEquipmentId = focusBooking,
                    onFocusShown = { focusBooking = null },
                )
                2 -> RosterScreen(onOpenBooking = { id -> focusBooking = id; tab = 1 })
                else -> ProfileScreen()
            }
            Toast(toast.value) { toast.value = null }
        }
    }
}

@Composable
private fun Header() {
    Row(
        Modifier.fillMaxWidth().background(C.surface).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            painterResource(R.drawable.hospital_logo), contentDescription = "Hospital logo",
            modifier = Modifier.size(36.dp), contentScale = ContentScale.Fit,
        )
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                "Quick Equipment Log", fontSize = 19.sp, fontWeight = FontWeight.Bold, color = C.onSurface,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Text(
                "${AppStore.ward.value} • ${AppStore.nurseName.value}", fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold, color = C.primary, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        Box {
            Icon(Icons.Outlined.Notifications, "Notifications", tint = C.onSurfaceVariant, modifier = Modifier.padding(10.dp))
            if (AppStore.waitlist.isNotEmpty()) {
                Box(Modifier.align(Alignment.TopEnd).padding(8.dp).size(8.dp).clip(CircleShape).background(C.error))
            }
        }
        Spacer(Modifier.width(4.dp))
        Image(
            painterResource(R.drawable.profile_avatar), contentDescription = "Profile",
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(38.dp).clip(CircleShape).border(1.dp, C.outlineVariant, CircleShape),
        )
    }
}
