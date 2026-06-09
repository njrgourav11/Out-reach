import axios from 'axios';

// Nominatim geocoder + Overpass API — 100% free, no API key needed
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS  = 'https://overpass-api.de/api/interpreter';

// Map plain-English niches → OSM tags
const NICHE_MAP = {
  'dentist':          '"amenity"="dentist"',
  'doctor':           '"amenity"="doctors"',
  'pharmacy':         '"amenity"="pharmacy"',
  'hospital':         '"amenity"="hospital"',
  'restaurant':       '"amenity"="restaurant"',
  'cafe':             '"amenity"="cafe"',
  'coffee shop':      '"amenity"="cafe"',
  'bakery':           '"shop"="bakery"',
  'salon':            '"shop"="hairdresser"',
  'hair salon':       '"shop"="hairdresser"',
  'barber':           '"shop"="barber"',
  'gym':              '"leisure"="fitness_centre"',
  'fitness':          '"leisure"="fitness_centre"',
  'yoga studio':      '"sport"="yoga"',
  'plumber':          '"craft"="plumber"',
  'electrician':      '"craft"="electrician"',
  'auto repair':      '"shop"="car_repair"',
  'car repair':       '"shop"="car_repair"',
  'lawyer':           '"office"="lawyer"',
  'accountant':       '"office"="accountant"',
  'real estate':      '"office"="estate_agent"',
  'real estate agent':'"office"="estate_agent"',
  'landscaping':      '"craft"="gardener"',
  'cleaning service': '"shop"="cleaning"',
  'photography':      '"shop"="photography"',
  'pet grooming':     '"shop"="pet_grooming"',
  'optometrist':      '"healthcare"="optometrist"',
  'chiropractor':     '"healthcare"="chiropractor"',
  'veterinarian':     '"amenity"="veterinary"',
  'hotel':            '"tourism"="hotel"',
  'supermarket':      '"shop"="supermarket"',
  'florist':          '"shop"="florist"',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getOSMTag(niche) {
  const key = niche.toLowerCase().trim();
  if (NICHE_MAP[key]) return NICHE_MAP[key];
  // Fallback: search by name if no direct tag match
  return `"name"~"${niche}",i`;
}

async function geocodeCity(city) {
  const { data } = await axios.get(NOMINATIM, {
    params: { q: `${city}, USA`, format: 'json', limit: 1 },
    headers: {
      'User-Agent': 'SandysourceOutreach/1.0 (sandysource.vercel.app)',
      'Accept-Language': 'en',
    },
    timeout: 10000,
  });

  if (!data || data.length === 0) {
    throw new Error(`City not found: "${city}". Try format like "Austin TX" or "Miami FL".`);
  }

  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

function formatAddress(tags = {}) {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function extractPhone(tags = {}) {
  return tags.phone || tags['contact:phone'] || tags['phone:mobile'] || null;
}

function extractWebsite(tags = {}) {
  const raw = tags.website || tags['contact:website'] || tags.url || null;
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  return 'https://' + raw;
}

function extractEmail(tags = {}) {
  return tags.email || tags['contact:email'] || null;
}

export async function searchBusinesses(niche, city, limit = 20) {
  console.log(`\n🗺️  Geocoding "${city}"...`);
  const { lat, lon } = await geocodeCity(city);
  console.log(`   ✅ Coordinates: ${lat}, ${lon}`);

  const osmTag = getOSMTag(niche);
  const radius = 20000; // 20km radius

  const query = `
[out:json][timeout:30];
(
  node[${osmTag}](around:${radius},${lat},${lon});
  way[${osmTag}](around:${radius},${lat},${lon});
);
out body;
`;

  console.log(`\n🔍 Querying Overpass API for "${niche}" near ${city}...`);

 const { data } = await axios.get(OVERPASS, {
  params: { data: query },
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'SandysourceOutreach/1.0',
  },
  timeout: 35000,
});

  const elements = (data.elements || []).filter(el => el.tags?.name);

  if (elements.length === 0) {
    console.log('⚠️  No results from Overpass — returning mock data');
    return getMockBusinesses(niche, city, limit);
  }

  console.log(`   ✅ Found ${elements.length} raw results, trimming to ${limit}`);

  return elements.slice(0, limit).map((el) => {
    const tags = el.tags || {};
    const email = extractEmail(tags);
    return {
      id: `osm_${el.type}_${el.id}`,
      name: tags.name,
      address: formatAddress(tags),
      phone: extractPhone(tags),
      website: extractWebsite(tags),
      rating: null,       // OSM doesn't have ratings
      totalRatings: 0,
      businessType: niche,
      city,
      email: email || null,
      emailStatus: email ? 'found' : 'pending',
      outreachStatus: 'new',
      source: 'openstreetmap',
      createdAt: new Date().toISOString(),
    };
  });
}

// ─── MOCK DATA (used when Overpass returns nothing) ───────────────────────────
function getMockBusinesses(niche, city, limit) {
  const mockNames = [
    'Bright Smile Dental', 'City Center Clinic', 'Main Street Bakery',
    'Prestige Auto Repair', 'Green Leaf Pharmacy', 'Sunrise Yoga Studio',
    'Lakeside Plumbing', 'Elite Hair Salon', 'Quick Fix Electronics',
    'Blue Ridge Real Estate', 'Harmony Chiropractic', 'Summit Fitness',
    'Golden Fork Restaurant', 'Pacific Accounting', 'Riverside Law Office',
    'Metro Tax Services', 'Coastal Pet Care', 'Pinewood Landscaping',
    'Urban Brew Coffee', 'Eagle Eye Photography',
  ];

  return mockNames.slice(0, limit).map((name, i) => ({
    id: `mock_${i}_${Date.now()}`,
    name,
    address: `${100 + i * 10} Main St, ${city}, USA`,
    phone: `+1 (555) ${100 + i}-${1000 + i}`,
    website: `https://www.${name.toLowerCase().replace(/\s/g, '')}.com`,
    rating: null,
    totalRatings: 0,
    businessType: niche,
    city,
    email: null,
    emailStatus: 'pending',
    outreachStatus: 'new',
    source: 'mock',
    createdAt: new Date().toISOString(),
  }));
}

export { NICHE_MAP };
