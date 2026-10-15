import os
import httpx
from typing import Dict, Any, Optional

class ElevenLabsTool:
    """
    Integrates ElevenLabs for:
    1. Contractor voice note transcription
    2. High-fidelity voice readout of generated proposals so contractors
       can listen to the drafted proposal while in their truck.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY", "")
        # Adam voice ID (professional, clear)
        self.default_voice_id = "pNInz6obpgDQGcFmaJgB"

    async def transcribe_audio(self, audio_bytes: bytes, filename: str = "audio.wav") -> str:
        """
        Transcribes speech using ElevenLabs Scribe or Whisper API.
        """
        if not self.api_key:
            return ""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": (filename, audio_bytes, "audio/wav")}
                headers = {"xi-api-key": self.api_key}
                resp = await client.post(
                    "https://api.elevenlabs.io/v1/speech-to-text",
                    files=files,
                    headers=headers
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("text", "")
        except Exception as e:
            print(f"ElevenLabs transcription error: {e}")
            
        return ""

    async def generate_speech_audio(self, text: str, voice_id: Optional[str] = None) -> Optional[bytes]:
        """
        Synthesizes realistic human audio narration of the client proposal.
        """
        if not self.api_key:
            return None

        vid = voice_id or self.default_voice_id
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text[:1000], # First 1000 chars
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    return resp.content
        except Exception as e:
            print(f"ElevenLabs TTS error: {e}")
        return None
