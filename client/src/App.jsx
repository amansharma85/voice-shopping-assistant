import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VoiceInput from './components/VoiceInput';
import './App.css';
import useLocalStorage from './hooks/useLocalStorage';

const CATEGORY_COLORS = {
  dairy: 'badge-dairy',
  produce: 'badge-produce',
  snacks: 'badge-snacks',
  household: 'badge-household',
  grains: 'badge-grains',
  other: 'badge-other'
};

function Badge({ category }) {
  const cls = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  return <span className={`badge ${cls}`}>{category}</span>;
}

function Spinner({ small }) {
  return <span className={small ? 'spinner spinner-sm' : 'spinner'} aria-hidden="true" />;
}

/* Hindi number word map (expand as necessary) */
const hindiNumberMap = {
  'एक': 1, 'एक्':1, '1':1,
  'दो': 2, 'दो':2, '2':2,
  'तीन': 3, '3':3,
  'चार': 4, '4':4,
  'पाँच': 5, 'पांच':5, '5':5,
  'छह': 6, '6':6,
  'सात': 7, '7':7,
  'आठ': 8, '8':8,
  'नौ': 9, '9':9,
  'दस': 10, '10':10
};

/* convert possible spoken number (hindi/english) to integer */
function parseSpokenNumber(token, lang = 'en-US') {
  if (!token) return null;
  // if already numeric
  const numeric = Number(token);
  if (!isNaN(numeric)) return Math.floor(numeric);

  if (lang.startsWith('hi')) {
    const cleaned = token.replace(/[^\u0900-\u097F]+/g, '').trim(); // keep Devanagari letters
    if (hindiNumberMap[cleaned] != null) return hindiNumberMap[cleaned];
    // also try common transliterations
    const translit = token.toLowerCase();
    if (translit === 'do') return 2;
    if (translit === 'ek') return 1;
  } else {
    // english words fallback (very small mapping)
    const eng = token.toLowerCase();
    if (eng === 'one' || eng === '1') return 1;
    if (eng === 'two' || eng === 'to' || eng === '2') return 2;
    if (eng === 'three' || eng === '3') return 3;
    if (!isNaN(Number(eng))) return Number(eng);
  }
  return null;
}

function App() {
  const [shoppingList, setShoppingList] = useLocalStorage('shoppingList', []);
  const [suggestions, setSuggestions] = useState([]);
  const [substitutes, setSubstitutes] = useState({});
  const [lastAdded, setLastAdded] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [transcriptHighlight, setTranscriptHighlight] = useState('');
  const BASE_URL = 'http://localhost:5000';

  const notify = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const fetchList = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/list`);
      const serverList = res.data.shoppingList || [];
      setShoppingList(prev => {
        const map = new Map();
        [...serverList, ...prev].forEach(i => {
          const key = i.item;
          if (!map.has(key)) map.set(key, { ...i });
          else map.set(key, { ...i, quantity: Math.max(map.get(key).quantity, i.quantity) });
        });
        return Array.from(map.values());
      });
    } catch (err) {
      console.error(err);
      notify('Failed to fetch list from server');
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/suggestions`);
      setSuggestions(res.data.suggestions || []);
      setSubstitutes(res.data.substitutes || {});
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchList();
    fetchSuggestions();
    // eslint-disable-next-line
  }, []);

  const addItem = async (item, quantity = 1) => {
    setLoading(true);
    const normalized = item.toLowerCase();
    setTranscriptHighlight(normalized);
    setShoppingList(prev => {
      const existing = prev.find(p => p.item === normalized);
      if (existing) return prev.map(p => p.item === normalized ? { ...p, quantity: p.quantity + quantity, _new: true } : p);
      return [...prev, { item: normalized, quantity, category: 'other', _new: true }];
    });
    try {
      await axios.post(`${BASE_URL}/add`, { item: normalized, quantity });
      setLastAdded(normalized);
      notify(`Added ${quantity} × ${normalized}`);
      await fetchList();
    } catch (err) {
      console.error(err);
      notify('Failed to add item');
      await fetchList();
    } finally {
      setTimeout(() => {
        setShoppingList(prev => prev.map(p => ({ ...p, _new: false })));
      }, 700);
      setLoading(false);
    }
  };

  const removeItem = async (item) => {
    setLoading(true);
    const normalized = item.toLowerCase();
    setShoppingList(prev => prev.map(p => p.item === normalized ? { ...p, _removing: true } : p));
    try {
      await axios.delete(`${BASE_URL}/remove`, { data: { item: normalized } });
      notify(`Removed ${normalized}`);
      setTimeout(async () => {
        await fetchList();
        setLoading(false);
      }, 300);
    } catch (err) {
      console.error(err);
      notify('Failed to remove item');
      await fetchList();
      setLoading(false);
    }
  };

  const clearList = async () => {
    setLoading(true);
    setShoppingList([]);
    try {
      await axios.post(`${BASE_URL}/clear`);
      notify('Cleared shopping list');
    } catch (err) {
      console.error(err);
      notify('Failed to clear list');
      await fetchList();
    } finally {
      setLoading(false);
    }
  };

  const searchItems = async ({ q, brand, price }) => {
    setStatusMessage('Searching...');
    try {
      const res = await axios.get(`${BASE_URL}/search`, { params: { q, brand, price } });
      const results = res.data.results || [];
      if (results.length === 0) notify('No items found');
      else {
        notify(`Found ${results.length} items. Adding top result to list.`);
        const top = results[0];
        await addItem(top.item || q, 1);
      }
    } catch (err) {
      console.error(err);
      notify('Search failed');
    } finally {
      setStatusMessage('');
    }
  };

  // --- NEW: Hindi-aware parsing + English parsing ---
  const handleCommand = async (text, lang = 'en-US') => {
    if (!text) return;
    setTranscriptHighlight(text);
    const t = text.toLowerCase().trim();
    console.log('Voice command:', t, 'lang:', lang);

    // First: voice search detection (works cross-language by checking English keywords or Hindi equivalents)
    const searchTriggersEng = /\b(find|search|show)\b/i;
    const searchTriggersHi = /(?:डूँढ|ढूँढ|खोज|कहाँ|कहां|खोजो|ढूँढो)/i;

    // Add/remove triggers for English
    const addRegexEng = /\b(?:add|buy|i need|i want|put|please add)\b\s*(\d+)?\s*(?:x|times|pieces|pcs|bottles|bottle|pack)?\s*(?:of)?\s*(.*)/i;
    const removeRegexEng = /\b(?:remove|delete|dont want|don't want|cancel|remove from list)\b\s*(.*)/i;

    // Add/remove triggers for Hindi (basic)
    // handles: "आलू जोड़ो", "मुझे दो आम चाहिए", "2 आम जोड़ें", "ब्रेड हटाओ"
    const addRegexHi = /(?:जोड़(?:ो|ें)?|जोडो|मुझे|चाहिए|लाना|ले आओ|लेआओ|ले आओ|लाओ)\s*(\d+|[^\s]+)?\s*(.*)?/iu;
    const removeRegexHi = /(?:हटा(?:ओ|ए)?|हटाओ|निकालो|डिलीट|हटाएँ|हटाना)\s*(.*)/iu;

    // Price patterns (English/Hindi)
    const pricePattern = /\b(under|below|less than|से कम)\s*(?:\$|rs|रु|रुपये|inr)?\s*([\d]+(?:\.\d+)?)/i;

    // If user asked to search (English or Hindi)
    if ((lang.startsWith('hi') && searchTriggersHi.test(t)) || (!lang.startsWith('hi') && searchTriggersEng.test(t))) {
      // Try to parse brand/price if present
      const pMatch = pricePattern.exec(t);
      const price = pMatch && pMatch[2] ? Number(pMatch[2]) : undefined;
      // simple q: remove 'find/search' or Hindi equivalents
      let q = t.replace(/\b(find|search|show|खोज|ढूँढ|ढूँढो|डूँढो)\b/ig, '').trim();
      await searchItems({ q, price });
      return;
    }

    // If language is Hindi, try Hindi patterns first
    if (lang.startsWith('hi')) {
      // Try add Hindi
      let m = addRegexHi.exec(text);
      if (m && (m[2] || m[1])) {
        // m[1] may be number or other token; m[2] aims for item but pattern above captures differently
        // We'll try to extract number and item robustly:
        // split text into words and search for number word
        const parts = text.trim().split(/\s+/);
        let qty = null;
        let itemTokens = [];

        // attempt: if first token is verb like "जोड़ो", then look for number and item after
        // simpler: search for any token that maps to number
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i].replace(/[^\u0900-\u097Fa-zA-Z0-9]+/g, '');
          const parsed = parseSpokenNumber(p, 'hi-IN');
          if (parsed != null && qty == null) {
            qty = parsed;
          } else if (!/जोड़|जोड|जाओ|हटा|निकाल|चाहिए|मुझे|दे|लाओ|लेआओ|ले/i.test(p)) {
            itemTokens.push(parts[i]);
          }
        }

        // If qty still null try to get from groups
        if (!qty && m[1]) qty = parseSpokenNumber(m[1], 'hi-IN');
        // item from m[2] or remaining tokens
        let item = (m[2] && m[2].trim()) || itemTokens.join(' ').trim();
        if (!item) {
          // fallback: last token as item
          item = parts.slice(-1).join(' ');
        }
        qty = qty || 1;
        item = item.replace(/^(का|की|के)\s+/i, '').trim(); // remove possessive tokens like "की"
        item = item.replace(/[^\u0900-\u097Fa-zA-Z0-9\s-]/g, '').trim();
        await addItem(item, qty);
        return;
      }

      // Try remove Hindi
      m = removeRegexHi.exec(text);
      if (m && m[1]) {
        const item = m[1].trim();
        if (item) {
          await removeItem(item);
          return;
        }
      }

      // fallback: simple phrases like "ब्रेड" (single word) -> add 1 bread
      if (/^[\u0900-\u097F0-9a-zA-Z\s\-]+$/.test(text) && text.trim().split(/\s+/).length <= 3) {
        // treat as add
        await addItem(text.trim(), 1);
        return;
      }

      // no match
      notify("Sorry, I couldn't understand that command.");
      return;
    }

    // Non-Hindi path (English)
    // Add English
    let match = addRegexEng.exec(t);
    if (match && match[2]) {
      const qty = match[1] ? parseInt(match[1], 10) : 1;
      const item = match[2].toLowerCase().replace(/\.$/, '').trim();
      await addItem(item, qty);
      return;
    }

    // Remove English
    match = removeRegexEng.exec(t);
    if (match && match[1]) {
      const item = match[1].toLowerCase().replace(/\.$/, '').trim();
      await removeItem(item);
      return;
    }

    // fallback english: single words assumed add
    if (/^[a-zA-Z]+(\s[a-zA-Z]+)?$/.test(t)) {
      await addItem(t, 1);
      return;
    }

    notify("Sorry, I couldn't understand that command.");
  };

  return (
    <div className="container">
      <header>
        <div className="logo">🛒</div>
        <h1>Voice Command Shopping Assistant</h1>
      </header>

      <main>
        <section className="left">
          {/* pass language along with text */}
          <VoiceInput onCommandRecognized={(text, lang) => handleCommand(text, lang)} />

          <div className="recognized-pill">
            <strong>Heard:</strong>
            {transcriptHighlight ? (
              <span className="pill">{transcriptHighlight}</span>
            ) : (
              <span className="pill pill-muted">—</span>
            )}
          </div>

          <div className="status">
            {statusMessage && <div className="status-msg">{statusMessage}</div>}
            {loading && <div className="status-msg"><Spinner small /> Working…</div>}
          </div>

          <div className="list-card">
            <h2>Your Shopping List</h2>
            {shoppingList.length === 0 ? (
              <p className="muted">Your list is empty. Use voice commands like "Add 2 apples".</p>
            ) : (
              <ul>
                {shoppingList.map((e, i) => (
                  <li key={i} className={`${e._new ? 'item-new' : ''} ${e._removing ? 'item-removing' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="qty">{e.quantity}</span>
                      <span className="item">{e.item}</span>
                      <Badge category={e.category} />
                    </div>
                    <div>
                      <button className="remove" onClick={() => removeItem(e.item)} disabled={loading}>
                        {loading ? <Spinner small /> : 'Remove'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div style={{ marginTop: '10px' }}>
              <button className="small-btn" onClick={clearList} disabled={loading}>Clear List</button>
            </div>
          </div>
        </section>

        <aside className="right">
          <div className="card">
            <h3>💡 Smart Suggestions</h3>
            <ul>
              {suggestions.map((s, i) => (
                <li key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div><strong className="suggest-type">{s.type}</strong> {s.item}</div>
                    <div>
                      <button onClick={() => addItem(s.item, 1)} className="small-btn" disabled={loading}>Add</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3>🔁 Substitutes</h3>
            {Object.keys(substitutes).length === 0 ? (
              <p className="muted">No substitutes available</p>
            ) : (
              <ul>
                {Object.entries(substitutes).map(([orig, alt], i) => (
                  <li key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="sub-line"><span className="sub-original">{orig}</span> <span className="sub-arrow">→</span> <strong className="sub-alt">{alt}</strong></div>
                      <div>
                        <button onClick={() => addItem(alt, 1)} className="small-btn" disabled={loading}>Add substitute</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lastAdded && substitutes[lastAdded] && (
            <div className="card highlight">
              <strong>Did you mean:</strong> {substitutes[lastAdded]} instead of {lastAdded}?
              <div className="actions" style={{ marginTop: '8px' }}>
                <button onClick={() => addItem(substitutes[lastAdded], 1)} className="small-btn" disabled={loading}>Yes, add</button>
              </div>
            </div>
          )}
        </aside>
      </main>

      <footer>
        <small>Built as an internship assignment — Voice-first shopping assistant</small>
      </footer>
    </div>
  );
}

export default App;
