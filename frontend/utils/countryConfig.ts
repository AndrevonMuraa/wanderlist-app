// Country configuration - flag codes, icons, geographic groupings
// Shared between explore-countries and other pages that need country data

// ISO 3166-1 alpha-2 country codes for flag CDN
export const COUNTRY_FLAG_CODES: Record<string, string> = {
  // Europe (20)
  'France': 'fr', 'Italy': 'it', 'Spain': 'es', 'United Kingdom': 'gb',
  'Germany': 'de', 'Greece': 'gr', 'Norway': 'no', 'Switzerland': 'ch',
  'Netherlands': 'nl', 'Portugal': 'pt', 'Sweden': 'se', 'Denmark': 'dk',
  'Iceland': 'is', 'Croatia': 'hr', 'Austria': 'at', 'Finland': 'fi',
  'Turkey': 'tr', 'Ireland': 'ie', 'Hungary': 'hu', 'Czech Republic': 'cz',
  // Asia (20)
  'Japan': 'jp', 'China': 'cn', 'Thailand': 'th', 'India': 'in',
  'Singapore': 'sg', 'Indonesia': 'id', 'South Korea': 'kr', 'Vietnam': 'vn',
  'Malaysia': 'my', 'Cambodia': 'kh', 'Nepal': 'np', 'Philippines': 'ph',
  'Sri Lanka': 'lk', 'Taiwan': 'tw', 'Laos': 'la', 'Mongolia': 'mn',
  'Bhutan': 'bt', 'Georgia': 'ge', 'Uzbekistan': 'uz', 'Pakistan': 'pk',
  // Africa (20)
  'Egypt': 'eg', 'South Africa': 'za', 'Morocco': 'ma', 'Kenya': 'ke',
  'Tanzania': 'tz', 'Botswana': 'bw', 'Namibia': 'na', 'Tunisia': 'tn',
  'Ghana': 'gh', 'Rwanda': 'rw', 'Uganda': 'ug', 'Ethiopia': 'et',
  'Senegal': 'sn', 'Zimbabwe': 'zw', 'Zambia': 'zm', 'Mozambique': 'mz',
  'Ivory Coast': 'ci', 'Malawi': 'mw', 'Lesotho': 'ls', 'Eswatini': 'sz',
  // Americas (20)
  'United States': 'us', 'Canada': 'ca', 'Mexico': 'mx', 'Brazil': 'br',
  'Peru': 'pe', 'Argentina': 'ar', 'Chile': 'cl', 'Colombia': 'co',
  'Ecuador': 'ec', 'Costa Rica': 'cr', 'Cuba': 'cu', 'Jamaica': 'jm',
  'Bahamas': 'bs', 'Barbados': 'bb', 'Dominican Republic': 'do', 'Panama': 'pa',
  'Uruguay': 'uy', 'Bolivia': 'bo', 'Belize': 'bz', 'Saint Lucia': 'lc',
  // Oceania & Island Paradises (20)
  'Australia': 'au', 'New Zealand': 'nz', 'Fiji': 'fj', 'French Polynesia': 'pf',
  'Cook Islands': 'ck', 'Samoa': 'ws', 'Vanuatu': 'vu',
  'Maldives': 'mv', 'Mauritius': 'mu', 'Seychelles': 'sc',
  'Hawaii': 'us-hi', 'Madagascar': 'mg', 'Cape Verde': 'cv',
  'Papua New Guinea': 'pg', 'Palau': 'pw', 'Solomon Islands': 'sb',
  'New Caledonia': 'nc', 'Guam': 'gu', 'Comoros': 'km', 'Reunion': 're',
};

export const getFlagUrl = (countryName: string): string => {
  const code = COUNTRY_FLAG_CODES[countryName];
  if (!code) return '';
  return `https://flagcdn.com/w320/${code}.png`;
};

export const CONTINENT_ICON_NAMES: Record<string, string> = {
  'Africa': 'sunny-outline',
  'Asia': 'earth-outline',
  'Europe': 'business-outline',
  'North America': 'leaf-outline',
  'South America': 'leaf-outline',
  'Americas': 'leaf-outline',
  'Oceania': 'water-outline',
  'Oceania and other Island Paradises': 'water-outline',
};

export const CONTINENT_DESCRIPTIONS: Record<string, string> = {
  'Europe': 'Rich history and diverse cultures await',
  'Asia': 'Ancient traditions meet modern wonders',
  'Africa': 'Wildlife, deserts, and vibrant cultures',
  'North America': 'Natural beauty and urban adventures',
  'South America': 'Rainforests, mountains, and ancient ruins',
  'Americas': 'Natural beauty and ancient civilizations',
  'Oceania': 'Pacific islands and coral reefs',
  'Oceania and other Island Paradises': 'Pacific islands, tropical gems and coral reefs',
};

// Countries that are geographically in Oceania (vs transferred island paradises)
export const OCEANIA_GEOGRAPHIC = new Set([
  'australia', 'new_zealand', 'fiji', 'french_polynesia',
  'cook_islands', 'samoa', 'vanuatu', 'papua_new_guinea',
  'palau', 'solomon_islands', 'new_caledonia',
]);

export interface Country {
  country_id: string;
  name: string;
  continent: string;
  landmark_count: number;
  total_points: number;
  visited?: number;
  percentage?: number;
  countryVisited?: boolean;
}

export interface ContinentSection {
  continent: string;
  data: Country[][];
}
