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

/**
 * Wraps Android's SpeechRecognizer for long, rambling dictation. The platform recognizer stops
 * after a short pause, so while the user hasn't tapped "stop" we restart it and keep appending
 * segments. The whole transcript (including corrections) goes to Gemini in one piece.
 */
class SpeechController(private val context: Context) {
    var listening by mutableStateOf(false); private set
    var committed by mutableStateOf(""); private set
    var partial by mutableStateOf(""); private set
    var level by mutableStateOf(0f); private set
    var error by mutableStateOf<String?>(null); private set

    val transcript: String get() = listOf(committed, partial).filter { it.isNotBlank() }.joinToString(" ")

    private var recognizer: SpeechRecognizer? = null

    val available: Boolean get() = SpeechRecognizer.isRecognitionAvailable(context)

    fun setText(text: String) {
        committed = text
        partial = ""
    }

    fun start(append: Boolean) {
        if (!available) {
            error = "No speech recognition service on this device. Type the request instead."
            return
        }
        error = null
        if (!append) setText("")
        listening = true
        launch()
    }

    fun stop() {
        listening = false
        // The final segment arrives via onResults/onError, which commit it; committing here too would duplicate it.
        recognizer?.stopListening()
        level = 0f
    }

    fun release() {
        listening = false
        recognizer?.destroy()
        recognizer = null
    }

    private fun commitPartial() {
        if (partial.isNotBlank()) {
            committed = listOf(committed, partial).filter { it.isNotBlank() }.joinToString(" ")
        }
        partial = ""
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
}
