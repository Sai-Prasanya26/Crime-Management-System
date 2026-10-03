import type { StateItem, DistrictItem } from '../../types';

export interface QueryResolution {
  route: string;
  destinationName: string;
  matchedState?: StateItem;
  matchedDistrict?: DistrictItem;
  extractedYear?: string;
  analysisType?: string;
  authRequired: boolean;
  adminOnly?: boolean;
}

export interface AmbiguousLocationMatch {
  id: string;
  name: string;
  context: string;
  resolution: QueryResolution;
}

export interface InterpretationResult {
  status: 'resolved' | 'ambiguous' | 'unrecognized';
  resolution?: QueryResolution;
  ambiguousMatches?: AmbiguousLocationMatch[];
  errorMessage?: string;
}

export type SuggestionIconType =
  | 'MapPin'
  | 'BarChart3'
  | 'TrendingUp'
  | 'ShieldAlert'
  | 'CarFront'
  | 'FileText'
  | 'Layers';

export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle: string;
  icon: SuggestionIconType;
  route: string;
  authRequired: boolean;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lightweight, structured query interpreter for user-driven global search.
 * Deterministically analyzes:
 * - Location (State, District from live geography data)
 * - Time (Year, Year ranges)
 * - Analysis / Task intent (Analytics, Trends, Risk, Predictions, Resources, Budget, Reports, etc.)
 */
export function interpretQuery(
  rawQuery: string,
  states: StateItem[],
  districts: DistrictItem[],
  isAdmin: boolean
): InterpretationResult {
  const query = rawQuery.trim();
  if (!query) {
    return { status: 'unrecognized' };
  }

  const lower = query.toLowerCase();

  // 1. Check for Admin intent
  if (/\b(admin|administration|audit logs?|user management)\b/i.test(lower)) {
    if (!isAdmin) {
      return {
        status: 'unrecognized',
        errorMessage: 'Administrative console requires administrator privileges.',
      };
    }
    return {
      status: 'resolved',
      resolution: {
        route: '/admin',
        destinationName: 'System Administration',
        authRequired: true,
        adminOnly: true,
      },
    };
  }

  // 2. Check for Staff Portal / Login intent
  if (/\b(staff portal|staff login|staff sign in|staff|login|sign in|auth|portal)\b/i.test(lower)) {
    return {
      status: 'resolved',
      resolution: {
        route: '/login',
        destinationName: 'Staff Portal',
        authRequired: false,
      },
    };
  }

  // 3. Extract Time / Year
  const rangeMatch = lower.match(/\b(20\d\d)\s*(?:to|-)\s*(20\d\d)\b/);
  const singleYearMatch = lower.match(/\b(20\d\d)\b/);
  const extractedYear = rangeMatch ? rangeMatch[2] : singleYearMatch ? singleYearMatch[1] : undefined;

  // 4. Extract Location: States
  const sortedStates = [...states].sort((a, b) => b.state_name.length - a.state_name.length);
  let matchedState = sortedStates.find((s) => {
    const sName = s.state_name.toLowerCase();
    const regex = new RegExp(`\\b${escapeRegExp(sName)}\\b`, 'i');
    return regex.test(lower);
  });

  // 5. Extract Location: Districts
  const sortedDistricts = [...districts].sort((a, b) => b.district_name.length - a.district_name.length);
  let matchedDistrict = sortedDistricts.find((d) => {
    const dName = d.district_name.toLowerCase();
    const regex = new RegExp(`\\b${escapeRegExp(dName)}\\b`, 'i');
    return regex.test(lower);
  });

  // If district matched but state not explicitly found in text, associate state from district
  if (matchedDistrict && !matchedState) {
    matchedState = states.find((s) => s.id === matchedDistrict?.state_id) || {
      id: matchedDistrict.state_id,
      state_name: matchedDistrict.state_name,
      entity_type: 'STATE',
    };
  }

  // 6. Identify Analysis Type / Task Intent
  const isWeaponsIntent = /\b(weapons?|weapon analysis|firearms?|knif(?:e|es)|sharp|arms)\b/i.test(lower);
  const isCrimeTypeIntent = /\b(crime types?|types? of crimes?|offense types?|homicide|murder|theft|robbery|burglary|assault)\b/i.test(lower);
  const isDemographicsIntent = /\b(demographics?|victims?|offenders?|gender|age profile)\b/i.test(lower);
  const isCategoriesIntent = /\b(crime categories|categories|violent crime|traffic fatalities)\b/i.test(lower);
  const isHourlyIntent = /\b(hourly|diurnal|shifts?|time of day|peak hours)\b/i.test(lower);

  const isTrendsIntent = /\b(trends?|temporal|timeline|seasonality|historical patterns?|patterns?)\b/i.test(lower);
  const isPredictIntent = /\b(predict|predictions?|predictive|forecasts?|forecasting|crime forecast)\b/i.test(lower);
  const isRiskIntent = /\b(risk|risks?|risk assessment|threats?|vulnerability|severity)\b/i.test(lower);
  const isResourceIntent = /\b(resources?|resource optimization|patrols?|patrol units|shortfalls?|personnel allocation)\b/i.test(lower);
  const isBudgetIntent = /\b(budgets?|budget estimation|costs?|expenditures?|fiscal)\b/i.test(lower);
  const isReportsIntent = /\b(reports?|intelligence reports?|briefings?|summary report|generate report)\b/i.test(lower);
  const isDistrictsIntent = /\b(districts? in|show districts?|jurisdictions?|geographic intelligence|geography|map)\b/i.test(lower);
  const isCrimeAnalyticsIntent = /\b(crime records?|crime analytics?|crimes? in|show crime|incidents?|analytics?)\b/i.test(lower);

  // Helper to build query strings
  const buildLocationParams = (): string => {
    const params = new URLSearchParams();
    if (matchedState) {
      params.set('state', matchedState.state_name);
      params.set('state_id', String(matchedState.id));
    }
    if (matchedDistrict) {
      params.set('district', matchedDistrict.district_name);
      params.set('district_id', String(matchedDistrict.id));
    }
    if (extractedYear) {
      params.set('year', extractedYear);
    }
    const q = params.toString();
    return q ? `?${q}` : '';
  };

  // 7. Route Mapping by Specificity

  // Predictive Intelligence / Forecasting
  if (isPredictIntent) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/predictions${queryStr}`,
        destinationName: matchedState
          ? `Predictive Intelligence — ${matchedState.state_name}`
          : 'Predictive Intelligence',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Predictive Intelligence',
        authRequired: true,
      },
    };
  }

  // Risk Assessment
  if (isRiskIntent) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/risk${queryStr}`,
        destinationName: matchedState
          ? `Crime Risk Assessment — ${matchedState.state_name}`
          : 'Crime Risk Assessment',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Risk Assessment',
        authRequired: true,
      },
    };
  }

  // Resource Optimization
  if (isResourceIntent) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/resources${queryStr}`,
        destinationName: matchedState
          ? `Resource Optimization — ${matchedState.state_name}`
          : 'Resource Optimization',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Resource Optimization',
        authRequired: true,
      },
    };
  }

  // Budget Intelligence
  if (isBudgetIntent) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/budget${queryStr}`,
        destinationName: matchedState
          ? `Budget Intelligence — ${matchedState.state_name}`
          : 'Budget Intelligence',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Budget Intelligence',
        authRequired: true,
      },
    };
  }

  // Intelligence Reports
  if (isReportsIntent) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/reports${queryStr}`,
        destinationName: matchedDistrict
          ? `Intelligence Reports — ${matchedDistrict.district_name}`
          : matchedState
            ? `Intelligence Reports — ${matchedState.state_name}`
            : 'Intelligence Reports',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Reports',
        authRequired: true,
      },
    };
  }

  // Crime Trends & Temporal Forecasting
  if (isTrendsIntent) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/trends${queryStr}`,
        destinationName: matchedState
          ? `Crime Trends — ${matchedState.state_name}${extractedYear ? ` (${extractedYear})` : ''}`
          : extractedYear
            ? `Crime Trends (${extractedYear})`
            : 'Crime Trends',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Crime Trends',
        authRequired: true,
      },
    };
  }

  // Weapon Analysis
  if (isWeaponsIntent) {
    const params = new URLSearchParams();
    if (matchedState) {
      params.set('state', matchedState.state_name);
      params.set('state_id', String(matchedState.id));
    }
    if (matchedDistrict) {
      params.set('district', matchedDistrict.district_name);
      params.set('district_id', String(matchedDistrict.id));
    }
    if (extractedYear) params.set('year', extractedYear);
    params.set('dimension', 'weapons');

    return {
      status: 'resolved',
      resolution: {
        route: `/analytics?${params.toString()}`,
        destinationName: matchedState
          ? `Weapons Analysis — ${matchedState.state_name}`
          : 'Weapon Distribution Analysis',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Weapons',
        authRequired: true,
      },
    };
  }

  // Crime Types Analysis
  if (isCrimeTypeIntent) {
    const params = new URLSearchParams();
    if (matchedState) {
      params.set('state', matchedState.state_name);
      params.set('state_id', String(matchedState.id));
    }
    if (matchedDistrict) {
      params.set('district', matchedDistrict.district_name);
      params.set('district_id', String(matchedDistrict.id));
    }
    if (extractedYear) params.set('year', extractedYear);
    params.set('dimension', 'types');

    return {
      status: 'resolved',
      resolution: {
        route: `/analytics?${params.toString()}`,
        destinationName: matchedState
          ? `Crime Types — ${matchedState.state_name}`
          : 'Crime Types Analysis',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Crime Types',
        authRequired: true,
      },
    };
  }

  // Demographics Analysis
  if (isDemographicsIntent) {
    const params = new URLSearchParams();
    if (matchedState) {
      params.set('state', matchedState.state_name);
      params.set('state_id', String(matchedState.id));
    }
    if (matchedDistrict) {
      params.set('district', matchedDistrict.district_name);
      params.set('district_id', String(matchedDistrict.id));
    }
    if (extractedYear) params.set('year', extractedYear);
    params.set('dimension', 'demographics');

    return {
      status: 'resolved',
      resolution: {
        route: `/analytics?${params.toString()}`,
        destinationName: matchedState
          ? `Demographics — ${matchedState.state_name}`
          : 'Demographics Analysis',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Demographics',
        authRequired: true,
      },
    };
  }

  // Categories Analysis
  if (isCategoriesIntent) {
    const params = new URLSearchParams();
    if (matchedState) {
      params.set('state', matchedState.state_name);
      params.set('state_id', String(matchedState.id));
    }
    if (matchedDistrict) {
      params.set('district', matchedDistrict.district_name);
      params.set('district_id', String(matchedDistrict.id));
    }
    if (extractedYear) params.set('year', extractedYear);
    params.set('dimension', 'categories');

    return {
      status: 'resolved',
      resolution: {
        route: `/analytics?${params.toString()}`,
        destinationName: matchedState
          ? `Crime Categories — ${matchedState.state_name}`
          : 'Crime Categories Breakdown',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Categories',
        authRequired: true,
      },
    };
  }

  // Hourly Analysis
  if (isHourlyIntent) {
    const params = new URLSearchParams();
    if (matchedState) {
      params.set('state', matchedState.state_name);
      params.set('state_id', String(matchedState.id));
    }
    if (matchedDistrict) {
      params.set('district', matchedDistrict.district_name);
      params.set('district_id', String(matchedDistrict.id));
    }
    if (extractedYear) params.set('year', extractedYear);
    params.set('dimension', 'hourly');

    return {
      status: 'resolved',
      resolution: {
        route: `/analytics?${params.toString()}`,
        destinationName: matchedState
          ? `Hourly Patterns — ${matchedState.state_name}`
          : 'Hourly Crime Distribution',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Hourly',
        authRequired: true,
      },
    };
  }

  // Explicit Districts List / Exploration (e.g. "districts in Telangana", "show districts in Maharashtra")
  if (isDistrictsIntent) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/districts${queryStr}`,
        destinationName: matchedState
          ? `Districts in ${matchedState.state_name}`
          : 'Geographic Intelligence',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Districts',
        authRequired: true,
      },
    };
  }

  // Crime Records / Crime Analytics (e.g. "Show crime records in Telangana", "Telangana crime", "Show crime analytics for Hyderabad")
  if (isCrimeAnalyticsIntent) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/analytics${queryStr}`,
        destinationName: matchedDistrict
          ? `Crime Analytics — ${matchedDistrict.district_name}`
          : matchedState
            ? `Crime Analytics — ${matchedState.state_name}`
            : 'Crime Analytics',
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Crime Analytics',
        authRequired: true,
      },
    };
  }

  // Location-Only Query (e.g. "Telangana", "Hyderabad", "Maharashtra")
  // Requirement: Direct navigation to Geographic Intelligence with location selected
  if (matchedDistrict) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/districts${queryStr}`,
        destinationName: `Geographic Intelligence — ${matchedDistrict.district_name}`,
        matchedState,
        matchedDistrict,
        extractedYear,
        analysisType: 'Geographic Intelligence',
        authRequired: true,
      },
    };
  }

  if (matchedState) {
    const queryStr = buildLocationParams();
    return {
      status: 'resolved',
      resolution: {
        route: `/districts${queryStr}`,
        destinationName: `Geographic Intelligence — ${matchedState.state_name}`,
        matchedState,
        extractedYear,
        analysisType: 'Geographic Intelligence',
        authRequired: true,
      },
    };
  }

  // Time-Only Query (e.g. "2024", "2025")
  if (extractedYear) {
    return {
      status: 'resolved',
      resolution: {
        route: `/dashboard?year=${extractedYear}`,
        destinationName: `Crime Analytics (${extractedYear})`,
        extractedYear,
        analysisType: 'Crime Analytics',
        authRequired: true,
      },
    };
  }

  // 8. Handle Partial / Ambiguous Location Search (e.g. user typed "Tel" or prefix)
  const trimmedLower = lower.replace(/[^a-z0-9\s]/gi, '').trim();
  if (trimmedLower.length >= 2) {
    const prefixStateMatches = states.filter((s) =>
      s.state_name.toLowerCase().startsWith(trimmedLower)
    );
    const prefixDistrictMatches = districts.filter((d) =>
      d.district_name.toLowerCase().startsWith(trimmedLower)
    );

    const totalPrefixMatches = [...prefixStateMatches, ...prefixDistrictMatches];

    // If exactly one match, directly resolve it!
    if (prefixStateMatches.length === 1 && prefixDistrictMatches.length === 0) {
      const s = prefixStateMatches[0];
      return {
        status: 'resolved',
        resolution: {
          route: `/districts?state=${encodeURIComponent(s.state_name)}&state_id=${s.id}`,
          destinationName: `Geographic Intelligence — ${s.state_name}`,
          matchedState: s,
          analysisType: 'Geographic Intelligence',
          authRequired: true,
        },
      };
    }

    if (prefixDistrictMatches.length === 1 && prefixStateMatches.length === 0) {
      const d = prefixDistrictMatches[0];
      return {
        status: 'resolved',
        resolution: {
          route: `/districts?state=${encodeURIComponent(d.state_name)}&state_id=${d.state_id}&district=${encodeURIComponent(d.district_name)}&district_id=${d.id}`,
          destinationName: `Geographic Intelligence — ${d.district_name}`,
          matchedDistrict: d,
          analysisType: 'Geographic Intelligence',
          authRequired: true,
        },
      };
    }

    // If multiple matches exist, provide disambiguation options
    if (totalPrefixMatches.length > 1 && totalPrefixMatches.length <= 6) {
      const ambiguousMatches: AmbiguousLocationMatch[] = [];

      prefixStateMatches.forEach((s) => {
        ambiguousMatches.push({
          id: `amb-state-${s.id}`,
          name: s.state_name,
          context: s.entity_type || 'State',
          resolution: {
            route: `/districts?state=${encodeURIComponent(s.state_name)}&state_id=${s.id}`,
            destinationName: `Geographic Intelligence — ${s.state_name}`,
            matchedState: s,
            analysisType: 'Geographic Intelligence',
            authRequired: true,
          },
        });
      });

      prefixDistrictMatches.slice(0, 4).forEach((d) => {
        ambiguousMatches.push({
          id: `amb-dist-${d.id}`,
          name: d.district_name,
          context: `District in ${d.state_name}`,
          resolution: {
            route: `/districts?state=${encodeURIComponent(d.state_name)}&state_id=${d.state_id}&district=${encodeURIComponent(d.district_name)}&district_id=${d.id}`,
            destinationName: `Geographic Intelligence — ${d.district_name}`,
            matchedDistrict: d,
            analysisType: 'Geographic Intelligence',
            authRequired: true,
          },
        });
      });

      return {
        status: 'ambiguous',
        ambiguousMatches,
      };
    }
  }

  // 9. Query could not be identified
  return {
    status: 'unrecognized',
    errorMessage:
      "Could not identify a project destination. Try a state, district, year, or analysis such as 'Telangana crime trends'.",
  };
}

const SUPPORTED_YEARS = ['2020', '2021', '2022', '2023', '2024', '2025'];

function formatTitleCase(name: string): string {
  if (!name) return name;
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return name;
}

/**
 * Context-aware autocomplete suggestion engine.
 * Generates dynamically ranked, structured suggestions for search queries.
 * Supports:
 * - Direct state/district matches (e.g. "tel", "hyd", "maha", "thane")
 * - Specific operational module intents (e.g. "crime", "trend", "risk", "forecast", "resource", "report")
 * - Combined queries (e.g. "Hyderabad crime", "Telangana trends", "risk Hyderabad", "Hyderabad 2025")
 * - Preserves validated year context (2020-2025)
 * Returns up to 5 strictly relevant suggestions.
 */
export function generateSearchSuggestions(
  rawQuery: string,
  states: StateItem[],
  districts: DistrictItem[]
): SearchSuggestion[] {
  const trimmed = rawQuery.trim();
  if (trimmed.length < 1) {
    return [];
  }

  const lower = trimmed.toLowerCase();
  const clean = lower.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();

  // 1. Detect Supported Year (2020-2025)
  let matchedYear: string | undefined;
  for (const y of SUPPORTED_YEARS) {
    if (new RegExp(`\\b${y}\\b`).test(clean)) {
      matchedYear = y;
      break;
    }
  }

  // 2. Intent Flags
  const hasCrime = /\b(crime|crimes|records?|incidents?|analytics?)\b/i.test(clean);
  const hasTrends = /\b(trend|trends|trending|forecast|forecasts|forecasting|patterns?|temporal)\b/i.test(clean);
  const hasRisk = /\b(risk|risks|threat|threats|vulnerability|severity)\b/i.test(clean);
  const hasPredict = /\b(predict|prediction|predictions|predictive)\b/i.test(clean);
  const hasResource = /\b(resource|resources|optimization|patrol|patrols|deployment|allocation)\b/i.test(clean);
  const hasReports = /\b(report|reports|briefing|briefings)\b/i.test(clean);
  const hasBudget = /\b(budget|budgets|cost|costs|expenditure)\b/i.test(clean);
  const hasGeo = /\b(geographic|geography|map|hotspots?|districts?)\b/i.test(clean);

  const hasAnyIntent = hasCrime || hasTrends || hasRisk || hasPredict || hasResource || hasReports || hasBudget || hasGeo;

  // 3. Strip Year and pure Intent words to identify Location tokens
  const stripRegex = new RegExp(
    `\\b(${SUPPORTED_YEARS.join('|')}|crime|crimes|records?|incidents?|analytics?|trends?|trending|forecasts?|forecasting|patterns?|temporal|risk|risks?|threats?|severity|predict|predictions?|predictive|resources?|optimization|patrols?|deployment|reports?|briefings?|budgets?|costs?|geographic|geography|map)\\b`,
    'gi'
  );
  const locToken = clean.replace(stripRegex, '').replace(/\s+/g, ' ').trim();

  let matchedDistrict: DistrictItem | undefined;
  let matchedState: StateItem | undefined;
  const prefixDistricts: DistrictItem[] = [];
  const prefixStates: StateItem[] = [];

  if (locToken.length >= 2 || (locToken.length >= 1 && !hasAnyIntent)) {
    // 3A. Match District by prefix or exact
    districts.forEach((d) => {
      const dName = d.district_name.toLowerCase();
      if (dName.startsWith(locToken) || dName === locToken) {
        prefixDistricts.push(d);
      }
    });
    if (prefixDistricts.length === 0) {
      districts.forEach((d) => {
        if (d.district_name.toLowerCase().includes(locToken)) {
          prefixDistricts.push(d);
        }
      });
    }

    // 3B. Match State by prefix or exact
    states.forEach((s) => {
      const sName = s.state_name.toLowerCase();
      if (sName.startsWith(locToken) || sName === locToken) {
        prefixStates.push(s);
      }
    });
    if (prefixStates.length === 0) {
      states.forEach((s) => {
        if (s.state_name.toLowerCase().includes(locToken)) {
          prefixStates.push(s);
        }
      });
    }

    matchedDistrict = prefixDistricts[0];
    matchedState = prefixStates[0];
  }

  // If district matched but state not explicitly found, associate state from district
  if (matchedDistrict && !matchedState) {
    matchedState = states.find((s) => s.id === matchedDistrict?.state_id) || {
      id: matchedDistrict.state_id,
      state_name: matchedDistrict.state_name,
      entity_type: 'STATE',
    };
  }

  const suggestions: SearchSuggestion[] = [];

  // Helper to build URL query parameters
  const buildUrl = (base: string): string => {
    const params = new URLSearchParams();
    if (matchedDistrict) {
      params.set('state', matchedState?.state_name || '');
      params.set('state_id', String(matchedDistrict.state_id));
      params.set('district', matchedDistrict.district_name);
      params.set('district_id', String(matchedDistrict.id));
    } else if (matchedState) {
      params.set('state', matchedState.state_name);
      params.set('state_id', String(matchedState.id));
    }
    if (matchedYear) {
      params.set('year', matchedYear);
    }
    const q = params.toString();
    return q ? `${base}?${q}` : base;
  };

  // --------------------------------------------------------------------------
  // PATTERN 1: COMBINED LOCATION + INTENT / YEAR (e.g. "Hyderabad crime", "Telangana trends", "Hyderabad 2025", "risk Hyderabad")
  // --------------------------------------------------------------------------
  if ((matchedDistrict || matchedState) && (hasRisk || hasTrends || hasCrime || hasResource || hasReports || hasBudget || hasPredict || matchedYear)) {
    const locName = matchedDistrict
      ? formatTitleCase(matchedDistrict.district_name)
      : formatTitleCase(matchedState!.state_name);
    const isDist = Boolean(matchedDistrict);
    const stateName = matchedState ? formatTitleCase(matchedState.state_name) : 'State';

    // 1A. User explicitly searched "risk [location]"
    if (hasRisk && !hasTrends && !hasCrime) {
      suggestions.push({
        id: `sug-risk-${matchedDistrict?.id || matchedState?.id}`,
        title: `${locName} Risk Assessment`,
        subtitle: 'Risk Assessment',
        icon: 'ShieldAlert',
        route: buildUrl('/risk'),
        authRequired: true,
      });
      suggestions.push({
        id: `sug-loc-${matchedDistrict?.id || matchedState?.id}`,
        title: locName,
        subtitle: isDist ? `District in ${stateName}` : 'State',
        icon: 'MapPin',
        route: buildUrl('/districts'),
        authRequired: true,
      });
    }
    // 1B. User searched "[location] trends"
    else if (hasTrends && !hasRisk) {
      suggestions.push({
        id: `sug-loc-${matchedDistrict?.id || matchedState?.id}`,
        title: locName,
        subtitle: isDist ? `District in ${stateName}` : 'State',
        icon: 'MapPin',
        route: buildUrl('/districts'),
        authRequired: true,
      });
      suggestions.push({
        id: `sug-trends-${matchedDistrict?.id || matchedState?.id}`,
        title: `${locName} Crime Trends${matchedYear ? ` — ${matchedYear}` : ''}`,
        subtitle: 'Crime Trends',
        icon: 'TrendingUp',
        route: buildUrl('/trends'),
        authRequired: true,
      });
    }
    // 1C. User searched "[location] 2025" (Year combination without conflicting intent)
    else if (matchedYear && !hasCrime && !hasTrends && !hasRisk) {
      suggestions.push({
        id: `sug-records-${matchedDistrict?.id || matchedState?.id}`,
        title: `${locName} Crime Records — ${matchedYear}`,
        subtitle: 'Crime Intelligence',
        icon: 'BarChart3',
        route: buildUrl('/dashboard'),
        authRequired: true,
      });
      suggestions.push({
        id: `sug-trends-${matchedDistrict?.id || matchedState?.id}`,
        title: `${locName} Crime Trends — ${matchedYear}`,
        subtitle: 'Crime Trends',
        icon: 'TrendingUp',
        route: buildUrl('/trends'),
        authRequired: true,
      });
      suggestions.push({
        id: `sug-loc-${matchedDistrict?.id || matchedState?.id}`,
        title: locName,
        subtitle: isDist ? `District in ${stateName}` : 'State',
        icon: 'MapPin',
        route: buildUrl('/districts'),
        authRequired: true,
      });
    }
    // 1D. User searched "[location] crime"
    else if (hasCrime) {
      suggestions.push({
        id: `sug-loc-${matchedDistrict?.id || matchedState?.id}`,
        title: locName,
        subtitle: isDist ? `District in ${stateName}` : 'State',
        icon: 'MapPin',
        route: buildUrl('/districts'),
        authRequired: true,
      });
      suggestions.push({
        id: `sug-intel-${matchedDistrict?.id || matchedState?.id}`,
        title: `${locName} Crime Analytics${matchedYear ? ` — ${matchedYear}` : ''}`,
        subtitle: 'Crime Analytics',
        icon: 'BarChart3',
        route: buildUrl('/analytics'),
        authRequired: true,
      });
      suggestions.push({
        id: `sug-trends-${matchedDistrict?.id || matchedState?.id}`,
        title: `${locName} Crime Trends${matchedYear ? ` — ${matchedYear}` : ''}`,
        subtitle: 'Crime Trends',
        icon: 'TrendingUp',
        route: buildUrl('/trends'),
        authRequired: true,
      });
      suggestions.push({
        id: `sug-risk-${matchedDistrict?.id || matchedState?.id}`,
        title: `${locName} Risk Assessment`,
        subtitle: 'Risk Assessment',
        icon: 'ShieldAlert',
        route: buildUrl('/risk'),
        authRequired: true,
      });
    }
    // 1E. Other specific combined intents
    else if (hasResource) {
      suggestions.push({
        id: `sug-res-${matchedDistrict?.id || matchedState?.id}`,
        title: `${locName} Resource Optimization`,
        subtitle: 'Resource Optimization',
        icon: 'CarFront',
        route: buildUrl('/resources'),
        authRequired: true,
      });
      suggestions.push({
        id: `sug-loc-${matchedDistrict?.id || matchedState?.id}`,
        title: locName,
        subtitle: isDist ? `District in ${stateName}` : 'State',
        icon: 'MapPin',
        route: buildUrl('/districts'),
        authRequired: true,
      });
    } else if (hasReports) {
      suggestions.push({
        id: `sug-rep-${matchedDistrict?.id || matchedState?.id}`,
        title: `${locName} Intelligence Reports`,
        subtitle: 'Intelligence Reports',
        icon: 'FileText',
        route: buildUrl('/reports'),
        authRequired: true,
      });
      suggestions.push({
        id: `sug-loc-${matchedDistrict?.id || matchedState?.id}`,
        title: locName,
        subtitle: isDist ? `District in ${stateName}` : 'State',
        icon: 'MapPin',
        route: buildUrl('/districts'),
        authRequired: true,
      });
    }
  }
  // --------------------------------------------------------------------------
  // PATTERN 2: LOCATION PREFIX / MATCH ONLY (e.g. "hyd", "tel", "maha", "thane")
  // --------------------------------------------------------------------------
  else if (matchedDistrict || matchedState) {
    if (matchedDistrict) {
      const dName = formatTitleCase(matchedDistrict.district_name);
      const sName = matchedState ? formatTitleCase(matchedState.state_name) : '';
      suggestions.push({
        id: `sug-dist-${matchedDistrict.id}`,
        title: dName,
        subtitle: sName ? `District in ${sName}` : 'District',
        icon: 'MapPin',
        route: `/districts?state_id=${matchedDistrict.state_id}&district_id=${matchedDistrict.id}`,
        authRequired: true,
      });
      suggestions.push({
        id: `sug-dash-${matchedDistrict.id}`,
        title: `${dName} Crime Intelligence`,
        subtitle: 'Crime Analytics',
        icon: 'BarChart3',
        route: `/dashboard?state_id=${matchedDistrict.state_id}&district_id=${matchedDistrict.id}`,
        authRequired: true,
      });
      suggestions.push({
        id: `sug-trends-${matchedDistrict.id}`,
        title: `${dName} Crime Trends`,
        subtitle: 'Crime Trends',
        icon: 'TrendingUp',
        route: `/trends?state_id=${matchedDistrict.state_id}&district_id=${matchedDistrict.id}`,
        authRequired: true,
      });
      suggestions.push({
        id: `sug-risk-${matchedDistrict.id}`,
        title: `${dName} Risk Assessment`,
        subtitle: 'Risk Assessment',
        icon: 'ShieldAlert',
        route: `/risk?state_id=${matchedDistrict.state_id}&district_id=${matchedDistrict.id}`,
        authRequired: true,
      });
    } else if (matchedState) {
      const sName = formatTitleCase(matchedState.state_name);
      suggestions.push({
        id: `sug-state-${matchedState.id}`,
        title: sName,
        subtitle: 'State',
        icon: 'MapPin',
        route: `/districts?state_id=${matchedState.id}`,
        authRequired: true,
      });
      suggestions.push({
        id: `sug-dash-${matchedState.id}`,
        title: `${sName} Crime Intelligence`,
        subtitle: 'Crime Analytics',
        icon: 'BarChart3',
        route: `/dashboard?state_id=${matchedState.id}`,
        authRequired: true,
      });
      suggestions.push({
        id: `sug-trends-${matchedState.id}`,
        title: `${sName} Crime Trends`,
        subtitle: 'Crime Trends',
        icon: 'TrendingUp',
        route: `/trends?state_id=${matchedState.id}`,
        authRequired: true,
      });
      suggestions.push({
        id: `sug-risk-${matchedState.id}`,
        title: `${sName} Risk Assessment`,
        subtitle: 'Risk Assessment',
        icon: 'ShieldAlert',
        route: `/risk?state_id=${matchedState.id}`,
        authRequired: true,
      });
    }
  }
  // --------------------------------------------------------------------------
  // PATTERN 3: INTENT / OPERATION ONLY (e.g. "crime", "trend", "risk", "forecast", "resource", "report")
  // --------------------------------------------------------------------------
  else {
    if (hasCrime) {
      suggestions.push({
        id: 'sug-mod-crime-analytics',
        title: 'Crime Analytics',
        subtitle: 'Pattern & Category Intelligence',
        icon: 'BarChart3',
        route: '/analytics',
        authRequired: true,
      });
      suggestions.push({
        id: 'sug-mod-crime-records',
        title: 'Crime Overview & Command Center',
        subtitle: 'Operational Intelligence Overview',
        icon: 'BarChart3',
        route: '/dashboard',
        authRequired: true,
      });
      suggestions.push({
        id: 'sug-mod-crime-trends',
        title: 'Crime Trends & Forecasting',
        subtitle: 'Temporal Analysis & Forecasting',
        icon: 'TrendingUp',
        route: '/trends',
        authRequired: true,
      });
    } else if (hasTrends) {
      suggestions.push({
        id: 'sug-mod-trends',
        title: 'Crime Trends & Forecasting',
        subtitle: 'Temporal Patterns & Forecasting',
        icon: 'TrendingUp',
        route: '/trends',
        authRequired: true,
      });
      suggestions.push({
        id: 'sug-mod-predictions',
        title: 'Predictive Intelligence',
        subtitle: 'Multi-Year Extrapolations',
        icon: 'Layers',
        route: '/predictions',
        authRequired: true,
      });
    } else if (hasRisk) {
      suggestions.push({
        id: 'sug-mod-risk',
        title: 'Crime Risk Assessment',
        subtitle: 'Jurisdictional Risk Analysis',
        icon: 'ShieldAlert',
        route: '/risk',
        authRequired: true,
      });
    } else if (hasPredict) {
      suggestions.push({
        id: 'sug-mod-trends',
        title: 'Crime Trends & Forecasting',
        subtitle: 'Temporal Patterns & Forecasting',
        icon: 'TrendingUp',
        route: '/trends',
        authRequired: true,
      });
      suggestions.push({
        id: 'sug-mod-predict',
        title: 'Predictive Intelligence',
        subtitle: 'Statistical Projections',
        icon: 'Layers',
        route: '/predictions',
        authRequired: true,
      });
    } else if (hasResource) {
      suggestions.push({
        id: 'sug-mod-res',
        title: 'Resource Optimization',
        subtitle: 'Deployment & Personnel Allocation',
        icon: 'CarFront',
        route: '/resources',
        authRequired: true,
      });
    } else if (hasReports) {
      suggestions.push({
        id: 'sug-mod-rep',
        title: 'Intelligence Reports',
        subtitle: 'Structured Analytical Reports',
        icon: 'FileText',
        route: '/reports',
        authRequired: true,
      });
    } else if (hasBudget) {
      suggestions.push({
        id: 'sug-mod-bud',
        title: 'Budget Intelligence',
        subtitle: 'Operational Resource Cost Estimator',
        icon: 'BarChart3',
        route: '/budget',
        authRequired: true,
      });
    } else if (matchedYear) {
      suggestions.push({
        id: `sug-year-dash-${matchedYear}`,
        title: `Crime Analytics — ${matchedYear}`,
        subtitle: 'Crime Intelligence Overview',
        icon: 'BarChart3',
        route: `/dashboard?year=${matchedYear}`,
        authRequired: true,
      });
      suggestions.push({
        id: `sug-year-trends-${matchedYear}`,
        title: `Crime Trends — ${matchedYear}`,
        subtitle: 'Crime Trends',
        icon: 'TrendingUp',
        route: `/trends?year=${matchedYear}`,
        authRequired: true,
      });
    }
  }

  // Maximum 5 suggestions strictly enforced
  return suggestions.slice(0, 5);
}
