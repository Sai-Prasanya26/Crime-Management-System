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
        route: `/dashboard?${params.toString()}`,
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
        route: `/dashboard?${params.toString()}`,
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
        route: `/dashboard?${params.toString()}`,
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
        route: `/dashboard?${params.toString()}`,
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
        route: `/dashboard?${params.toString()}`,
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
        route: `/dashboard${queryStr}`,
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
