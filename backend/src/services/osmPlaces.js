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

function getUserAgent() {
  const brand = (process.env.YOUR_BRAND || 'Gourav.blog').replace(/\s+/g, '');
  const portfolio = (process.env.YOUR_PORTFOLIO || 'https://gourav.blog').replace(/^https?:\/\//, '');
  return `${brand}Outreach/1.0 (${portfolio})`;
}

async function geocodeCity(city) {
  const { data } = await axios.get(NOMINATIM, {
    params: { q: `${city}, USA`, format: 'json', limit: 1 },
    headers: {
      'User-Agent': getUserAgent(),
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
  const osmTag = getOSMTag(niche);
  let query = '';

  const isLocal = city && city.trim() !== '';

  if (isLocal) {
    console.log(`\n🗺️  Geocoding "${city}"...`);
    const { lat, lon } = await geocodeCity(city);
    console.log(`   ✅ Coordinates: ${lat}, ${lon}`);
    const radius = 20000; // 20km radius

    // Local search for businesses with email and no website
    query = `
[out:json][timeout:35];
(
  node[${osmTag}]["email"][!"website"](around:${radius},${lat},${lon});
  node[${osmTag}]["contact:email"][!"website"](around:${radius},${lat},${lon});
  way[${osmTag}]["email"][!"website"](around:${radius},${lat},${lon});
  way[${osmTag}]["contact:email"][!"website"](around:${radius},${lat},${lon});
);
out body ${limit};
`;
    console.log(`\n🔍 Querying Overpass API for "${niche}" near "${city}" (with email & no website, limit: ${limit})...`);
  } else {
    // Global search for businesses with email and no website (restricted to US area for speed and to avoid timeouts)
    query = `
[out:json][timeout:90];
area["ISO3166-1"="US"]->.usa;
(
  node[${osmTag}]["email"][!"website"](area.usa);
  node[${osmTag}]["contact:email"][!"website"](area.usa);
  way[${osmTag}]["email"][!"website"](area.usa);
  way[${osmTag}]["contact:email"][!"website"](area.usa);
);
out body ${limit};
`;
    console.log(`\n🔍 Querying Overpass API for US-wide "${niche}" (with email & no website, limit: ${limit})...`);
  }

  let elements = [];
  try {
    const { data } = await axios.get(OVERPASS, {
      params: { data: query },
      headers: {
        'Accept': 'application/json',
        'User-Agent': getUserAgent(),
      },
      timeout: isLocal ? 35000 : 95000, // Longer timeout for global planet query
    });
    elements = (data.elements || []).filter(el => el.tags?.name);
  } catch (err) {
    console.warn(`⚠️  Overpass API error (${err.message})`);
    throw new Error(`OpenStreetMap API search timed out or encountered a network error. Please try again.`);
  }

  if (elements.length === 0) {
    console.log('⚠️  No results found from Overpass API');
    return [];
  }

  console.log(`   ✅ Found ${elements.length} results`);

  return elements
    .map((el) => {
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
        city: city || tags['addr:city'] || 'Global',
        email: email || null,
        emailStatus: email ? 'found' : 'pending',
        outreachStatus: 'new',
        source: 'openstreetmap',
        createdAt: new Date().toISOString(),
      };
    })
    .filter(b => b.email && b.email.trim() !== '')
    .slice(0, limit);
}

export { NICHE_MAP };
