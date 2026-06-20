// ── Drapeaux ──────────────────────────────────────────────────────────────
const FLAG = {
  'Afrique du Sud':'za',    'Algérie':'dz',           'Allemagne':'de',
  'Angleterre':'gb-eng',    'Arabie saoudite':'sa',    'Argentine':'ar',
  'Australie':'au',         'Autriche':'at',           'Belgique':'be',
  'Bosnie-Herzégovine':'ba','Brésil':'br',             'Canada':'ca',
  'Cap-Vert':'cv',          'Colombie':'co',           'Corée du Sud':'kr',
  'Croatie':'hr',           'Curaçao':'cw',            "Côte d'Ivoire":'ci',
  'Espagne':'es',           'France':'fr',             'Ghana':'gh',
  'Haïti':'ht',             'Irak':'iq',               'Iran':'ir',
  'Japon':'jp',             'Jordanie':'jo',           'Maroc':'ma',
  'Mexique':'mx',           'Norvège':'no',            'Nouvelle-Zélande':'nz',
  'Ouzbékistan':'uz',       'Panama':'pa',             'Paraguay':'py',
  'Pays-Bas':'nl',          'Portugal':'pt',           'Qatar':'qa',
  'RD Congo':'cd',          'Rép. tchèque':'cz',       'Suisse':'ch',
  'Suède':'se',             'Sénégal':'sn',            'Tunisie':'tn',
  'Turquie':'tr',           'Uruguay':'uy',            'Écosse':'gb-sct',
  'Égypte':'eg',            'Équateur':'ec',           'États-Unis':'us',
};

// ── Constantes ────────────────────────────────────────────────────────────
const DUR_GROUP  = 115 * 60 * 1000;
const DUR_KO     = 160 * 60 * 1000;
const DAYS       = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MONTHS     = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const ESPN_URL   = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260719';

// ── Utilitaires ───────────────────────────────────────────────────────────
function utcKey(utc) { return utc.slice(0, 16) + 'Z'; }

function dayLabel(utc) {
  const d = new Date(new Date(utc).toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// ── Fetch ESPN avec cache localStorage (TTL 20 s) ─────────────────────────
async function fetchEspnData() {
  const KEY = 'cdm_espn';
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (cached && Date.now() - cached.ts < 20000) return cached.data;
  try {
    const r = await fetch(ESPN_URL);
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    try { localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
    return data;
  } catch {
    return cached?.data ?? null;
  }
}
