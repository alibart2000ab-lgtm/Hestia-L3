import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const API_KEY = process.env.OPENAI_API_KEY;
const API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `Sei Hestia, un assistente domotico gentile e diretto integrato in un'app per smart home.
Rispondi sempre in italiano, in modo breve (una frase, massimo due), come conferma di un'azione svolta in casa
(luci, tapparelle, termostato, allarme, porte) oppure come piccola chiacchierata se l'utente non chiede un'azione.
Non usare markdown, non usare emoji, tono naturale e umano.`;

app.post('/api/chat', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY non configurata sul server (.env).' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Payload non valido: atteso { messages: [...] }' });
  }

  try {
    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.6,
        max_tokens: 120,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Errore API upstream:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Errore API upstream' });
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || '...';
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
