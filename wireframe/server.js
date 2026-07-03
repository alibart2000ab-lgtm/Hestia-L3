import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `Sei Hestia, un assistente domotico gentile e diretto integrato in un'app per smart home.
Rispondi sempre in italiano, in modo breve (una frase, massimo due), come conferma di un'azione svolta in casa
(luci, tapparelle, termostato, allarme, porte) oppure come piccola chiacchierata se l'utente non chiede un'azione.
Non usare markdown, non usare emoji, tono naturale e umano.`;

app.post('/api/chat', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY non configurata sul server (.env).' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Payload non valido: atteso { messages: [...] }' });
  }

  // converte lo storico {role:'user'|'assistant', content} nel formato Gemini
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 120 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Errore API upstream:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Errore API upstream' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '...';
    res.json({ reply });
  } catch (err) {
    console.error('Errore chiamata API:', err);
    res.status(500).json({ error: 'Impossibile contattare il modello.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hestia server attivo su http://localhost:${PORT}`);
});
