import axios from 'axios';
import dotenv from 'dotenv';
import { extractEmail } from './emailExtractor.js';
dotenv.config();

const TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const DETAILS_URL     = 'https://maps.googleapis.com/maps/api/place/details/json';

function getApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if website is a social media link or completely missing (which counts as "no website" target)
function isNoWebsiteTarget(website) {
  if (!website) return true;
  const socialPatterns = [
    /facebook\.com/i,
    /instagram\.com/i,
    /twitter\.com/i,
    /linkedin\.com/i,
    /yelp\.com/i,
    /youtube\.com/i,
    /pinterest\.com/i,
    /foursquare\.com/i
  ];
  return socialPatterns.some(pattern => pattern.test(website));
}

export async function searchGoogleBusinesses(niche, city, limit = 20) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Google Places API key is missing.');
  }

  // Construct query: "dentist in Charlotte NC" or just "dentist" globally
  const query = city && city.trim() !== '' ? `${niche} in ${city}` : niche;
  console.log(`\n🔍 Querying Google Places Text Search: "${query}"...`);

  const { data: searchData } = await axios.get(TEXT_SEARCH_URL, {
    params: {
      query,
      key: apiKey
    }
  });

  if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places Text Search error: ${searchData.status} ${searchData.error_message || ''}`);
  }

  const results = searchData.results || [];
  console.log(`   ✅ Text Search returned ${results.length} raw results. Fetching details...`);

  const leads = [];
  
  // We iterate through search results and fetch Place Details for each
  // to get websites and phone numbers, filtering for leads with emails
  for (const place of results) {
    if (leads.length >= limit) break;

    try {
      console.log(`   ➡️ Fetching details for: ${place.name} (${place.place_id})`);
      const { data: detailsData } = await axios.get(DETAILS_URL, {
        params: {
          place_id: place.place_id,
          fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,address_components',
          key: apiKey
        }
      });

      if (detailsData.status !== 'OK') {
        console.warn(`   ⚠️ Place details error for ${place.place_id}: ${detailsData.status}`);
        continue;
      }

      const details = detailsData.result || {};
      const website = details.website || null;

      // Only target businesses with no website (or just a social media profile)
      if (!isNoWebsiteTarget(website)) {
        console.log(`   ⏭️ Skipping ${details.name} (already has a website: ${website})`);
        continue;
      }

      // Extract email from the website (if website exists)
      let email = null;
      if (website) {
        console.log(`   📧 Scraping website for email: ${website}`);
        email = await extractEmail(website);
      }

      // If no email could be found, skip/discard this lead
      if (!email) {
        console.log(`   ⏭️ Skipping ${details.name} (no email available)`);
        continue;
      }

      // Parse city from address components if city was empty in global search
      let leadCity = city || 'Global';
      if (!city && details.address_components) {
        const locality = details.address_components.find(c => c.types.includes('locality'));
        const state = details.address_components.find(c => c.types.includes('administrative_area_level_1'));
        if (locality && state) {
          leadCity = `${locality.long_name} ${state.short_name}`;
        } else if (locality) {
          leadCity = locality.long_name;
        }
      }

      leads.push({
        id: `gmaps_${place.place_id}`,
        name: details.name || place.name,
        address: details.formatted_address || place.formatted_address || null,
        phone: details.formatted_phone_number || null,
        website: website, // Could be null or social link
        rating: details.rating || null,
        totalRatings: details.user_ratings_total || 0,
        businessType: niche,
        city: leadCity,
        email: email,
        emailStatus: 'found',
        outreachStatus: 'new',
        source: 'google_maps',
        createdAt: new Date().toISOString()
      });

      // Polite delay between details requests
      await sleep(200);
    } catch (err) {
      console.error(`   ❌ Error fetching details for ${place.place_id}:`, err.message);
    }
  }

  console.log(`   ✅ Completed Google Maps search. Found ${leads.length} qualified leads (no website).`);
  return leads;
}
