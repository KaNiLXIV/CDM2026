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

// Traduction noms ESPN (anglais) → noms français
const TEAM_EN_FR = {
  'Algeria':'Algérie',           'Argentina':'Argentine',       'Australia':'Australie',
  'Austria':'Autriche',          'Belgium':'Belgique',          'Bosnia-Herzegovina':'Bosnie-Herzégovine',
  'Brazil':'Brésil',             'Canada':'Canada',             'Cape Verde':'Cap-Vert',
  'Colombia':'Colombie',         'Congo DR':'RD Congo',         'Croatia':'Croatie',
  'Curaçao':'Curaçao',           'Ivory Coast':"Côte d'Ivoire", 'Czechia':'Rép. tchèque',
  'Ecuador':'Équateur',          'Egypt':'Égypte',              'England':'Angleterre',
  'France':'France',             'Germany':'Allemagne',         'Ghana':'Ghana',
  'Haiti':'Haïti',               'Iran':'Iran',                 'Iraq':'Irak',
  'Japan':'Japon',               'Jordan':'Jordanie',           'Mexico':'Mexique',
  'Morocco':'Maroc',             'Netherlands':'Pays-Bas',      'New Zealand':'Nouvelle-Zélande',
  'Norway':'Norvège',            'Panama':'Panama',             'Paraguay':'Paraguay',
  'Portugal':'Portugal',         'Qatar':'Qatar',               'Saudi Arabia':'Arabie saoudite',
  'Scotland':'Écosse',           'Senegal':'Sénégal',           'South Africa':'Afrique du Sud',
  'South Korea':'Corée du Sud',  'Spain':'Espagne',             'Sweden':'Suède',
  'Switzerland':'Suisse',        'Tunisia':'Tunisie',           'Türkiye':'Turquie',
  'United States':'États-Unis',  'Uruguay':'Uruguay',           'Uzbekistan':'Ouzbékistan',
};

// ── Constantes ────────────────────────────────────────────────────────────
const DUR_GROUP  = 115 * 60 * 1000;
const DUR_KO     = 160 * 60 * 1000;
const DAYS       = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MONTHS     = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const ESPN_URL   = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260719';

// ── Utilitaires ───────────────────────────────────────────────────────────
const _fmtDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
});
const _fmtTime = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false,
});

function dayLabel(utc) {
  const ymd = _fmtDate.format(new Date(utc));
  const [year, month, day] = ymd.split('-').map(Number);
  const ref = new Date(Date.UTC(year, month - 1, day));
  return `${DAYS[ref.getUTCDay()]} ${day} ${MONTHS[month - 1]}`;
}

function timeLabel(utc) {
  return _fmtTime.format(new Date(utc));
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
