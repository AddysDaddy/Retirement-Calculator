console.log( "Loaded tables.js" );

// Retireent Income Targets based on Age and Spending Goal
// https://corporate.morningstar.com/ib/documents/MethodologyDocuments/ResearchPapers/Blanchett_True-Cost-of-Retirement.pdf
var retirementIncomeTargetBaseAge = 60;
var retirementIncomeTargetMaxAge = 95;
var retirementIncomeTargetSpacing = 5;
var retirementIncomeTarget = {
  LowSpending:  [ 1.00, 1.00, 0.98, 0.96, 0.91, 0.89, 0.89, 0.92 ], // $25k Retirement Spending Goal (< $37.5k)
  MidSpending:  [ 1.00, 0.98, 0.95, 0.88, 0.83, 0.80, 0.79, 0.80 ], // $50k Retirement Spending Goal (< $75k)
  HighSpending: [ 1.00, 0.95, 0.89, 0.81, 0.75, 0.71, 0.70, 0.70 ], // $100k Retirement Spending Goal
};
var retirementIncomeOldAgeRequirementFactor = 1.04; // Assuming 4% increase / year growth in medical expenses

// 2016 Federal Income Tax Brackets
var taxBrackets_US = {
  Single: [ 
            {rate: 0.100, taxBase: 0, incomeBase: 0},
            {rate: 0.150, taxBase: 927.50, incomeBase: 9275},
            {rate: 0.250, taxBase: 5183.75, incomeBase: 37650},
            {rate: 0.280, taxBase: 18558.75, incomeBase: 91150},
            {rate: 0.330, taxBase: 46278.75, incomeBase: 190150},
            {rate: 0.350, taxBase: 119934.75, incomeBase: 413350},
            {rate: 0.396, taxBase: 120529.75, incomeBase: 415050} ],
  MarriedFilingJointly: [ 
            {rate: 0.100, taxBase: 0, incomeBase: 0},
            {rate: 0.150, taxBase: 1855, incomeBase: 18550},
            {rate: 0.250, taxBase: 10367.50, incomeBase: 75300},
            {rate: 0.280, taxBase: 29517.50, incomeBase: 151900},
            {rate: 0.330, taxBase: 51791.50, incomeBase: 231450},
            {rate: 0.350, taxBase: 111818.50, incomeBase: 413350},
            {rate: 0.396, taxBase: 130578.50, incomeBase: 466950} ],
  MarriedFilingSeparately: [ 
            {rate: 0.100, taxBase: 0, incomeBase: 0},
            {rate: 0.150, taxBase: 927.50, incomeBase: 9275},
            {rate: 0.250, taxBase: 5183.75, incomeBase: 37650},
            {rate: 0.280, taxBase: 14758.75, incomeBase: 75950},
            {rate: 0.330, taxBase: 25895.75, incomeBase: 115725},
            {rate: 0.350, taxBase: 55909.25, incomeBase: 206675},
            {rate: 0.396, taxBase: 65289.25, incomeBase: 233475} ],
  HeadOfHousehold: [ 
            {rate: 0.100, taxBase: 0, incomeBase: 0},
            {rate: 0.150, taxBase: 1325.00, incomeBase: 13250},
            {rate: 0.250, taxBase: 6897.50, incomeBase: 50400},
            {rate: 0.280, taxBase: 26835.00, incomeBase: 130150},
            {rate: 0.330, taxBase: 49417.00, incomeBase: 210800},
            {rate: 0.350, taxBase: 116258.50, incomeBase: 413350},
            {rate: 0.396, taxBase: 125936.00, incomeBase: 441000} ]
};

// 2016 Top State Marginal Individual Income Tax Rates
// http://taxfoundation.org/article/state-individual-income-tax-rates-and-brackets-2016
var taxBrackets_State = {
  AL: 0.050,
  AK: 0.0,
  AZ: 0.0454,
  AR: 0.069,
  CA: 0.133,
  CO: 0.0463,
  CT: 0.0699,
  DE: 0.066,
  FL: 0.0,
  GA: 0.060,
  HI: 0.0825,
  ID: 0.074,
  IL: 0.0375,
  IN: 0.033,
  IA: 0.0898,
  KS: 0.046,
  KY: 0.060,
  LA: 0.060,
  ME: 0.0715,
  MD: 0.0575,
  MA: 0.051,
  MI: 0.0425,
  MN: 0.0985,
  MS: 0.050,
  MO: 0.060,
  MT: 0.069,
  NE: 0.0684,
  NV: 0.0,
  NH: 0.050,
  NJ: 0.0897,
  NM: 0.049,
  NY: 0.0882,
  NC: 0.0575,
  ND: 0.029,
  OH: 0.04997,
  OK: 0.050,
  OR: 0.099,
  PA: 0.0307,
  RI: 0.0599,
  SC: 0.070,
  SD: 0.0,
  TN: 0.060,
  TX: 0.0,
  UT: 0.050,
  VT: 0.0,
  VA: 0.0575,
  WA: 0.0,
  WV: 0.065,
  WI: 0.0765,
  WY: 0.0
};

// Income Trajectory Arrays [Internal]
var incomeTrajectoryBaseAge = 25;
var incomeTrajectoryMaxAge = 64;
var incomeByLTHighSchool = [
    1.0000, 1.0104, 1.0208, 1.0311, 1.0415,
    1.0519, 1.0640, 1.0762, 1.0883, 1.1005,
    1.1126, 1.1247, 1.1368, 1.1490, 1.1611,
    1.1732, 1.1853, 1.1974, 1.2096, 1.2217,
    1.2338, 1.2459, 1.2580, 1.2702, 1.2823,
    1.2944, 1.3065, 1.3186, 1.3308, 1.3429,
    1.3550, 1.3567, 1.3584, 1.3602, 1.3619,
    1.3636, 1.3636, 1.3636, 1.3636, 1.3636    
    ];
var incomeByHighSchool = [
    1.0000, 1.0047, 1.0094, 1.0140, 1.0187,
    1.0234, 1.0234, 1.0234, 1.0234, 1.0234,
    1.0234, 1.0234, 1.0234, 1.0234, 1.0234,
    1.0234, 1.0375, 1.0516, 1.0656, 1.0797,
    1.0938, 1.1063, 1.1188, 1.1313, 1.1438,
    1.1563, 1.1563, 1.1563, 1.1563, 1.1563,
    1.1563, 1.1438, 1.1313, 1.1188, 1.1063,
    1.0938, 1.0938, 1.0938, 1.0938, 1.0938
    ];
var incomeBySomeCollege = [
    1.0000, 1.0176, 1.0353, 1.0529, 1.0706,
    1.0882, 1.1059, 1.1235, 1.1412, 1.1588,
    1.1765, 1.1824, 1.1883, 1.1941, 1.2000,
    1.2059, 1.2118, 1.2177, 1.2235, 1.2294,
    1.2353, 1.2412, 1.2471, 1.2529, 1.2588,
    1.2647, 1.2588, 1.2529, 1.2471, 1.2412,
    1.2353, 1.2235, 1.2118, 1.2000, 1.1883,
    1.1765, 1.1765, 1.1765, 1.1765, 1.1765
    ];
var incomeByAssociatesDegree = [
    1.0000, 1.0141, 1.0281, 1.0422, 1.0562,
    1.0703, 1.0843, 1.0984, 1.1124, 1.1265,
    1.1405, 1.1546, 1.1686, 1.1827, 1.1967,
    1.2108, 1.2249, 1.2389, 1.2530, 1.2670,
    1.2811, 1.2952, 1.3092, 1.3233, 1.3373,
    1.3514, 1.3379, 1.3244, 1.3108, 1.2973,
    1.2838, 1.2703, 1.2568, 1.2432, 1.2297,
    1.2162, 1.2162, 1.2162, 1.2162, 1.2162
    ];
var incomeByBachelorsDegree = [
    1.0000, 1.0250, 1.0500, 1.0750, 1.1000,
    1.1250, 1.1500, 1.1750, 1.2000, 1.2250,
    1.2500, 1.2604, 1.2708, 1.2813, 1.2917,
    1.3021, 1.3125, 1.3229, 1.3334, 1.3438,
    1.3542, 1.3500, 1.3458, 1.3417, 1.3375,
    1.3333, 1.3208, 1.3083, 1.2958, 1.2833,
    1.2708, 1.2583, 1.2458, 1.2333, 1.2208,
    1.2083, 1.2083, 1.2083, 1.2083, 1.2083
    ];
var incomeByMastersDegree = [
    1.0000, 1.0269, 1.0538, 1.0808, 1.1077,
    1.1346, 1.1615, 1.1884, 1.2154, 1.2423,
    1.2692, 1.2961, 1.3230, 1.3500, 1.3769,
    1.4038, 1.4307, 1.4577, 1.4846, 1.5116,
    1.5385, 1.5321, 1.5257, 1.5192, 1.5128,
    1.5064, 1.5000, 1.4936, 1.4872, 1.4808,
    1.4744, 1.4680, 1.4616, 1.4551, 1.4487,
    1.4423, 1.4423, 1.4423, 1.4423, 1.4423
    ];
var incomeByDoctoralDegree = [
    1.0000, 1.0240, 1.0480, 1.0720, 1.0960,
    1.1200, 1.1573, 1.1947, 1.2320, 1.2694,
    1.3067, 1.3440, 1.3813, 1.4187, 1.4560,
    1.4933, 1.5306, 1.5680, 1.6053, 1.6427,
    1.6800, 1.6640, 1.6480, 1.6320, 1.6160,
    1.6000, 1.6160, 1.6320, 1.6480, 1.6640,
    1.6800, 1.6800, 1.6800, 1.6800, 1.6800,
    1.6800, 1.6800, 1.6800, 1.6800, 1.6800
    ];
var incomeByProfessionalDegree = [
    1.0000, 1.0667, 1.1333, 1.2000, 1.2666,
    1.3333, 1.4666, 1.6000, 1.7333, 1.8667,
    2.0000, 2.0000, 2.0000, 2.0000, 2.0000,
    2.0000, 2.0000, 2.0000, 2.0000, 2.0000,
    2.0000, 1.9833, 1.9667, 1.9500, 1.9334,
    1.9167, 1.9167, 1.9167, 1.9167, 1.9167,
    1.9167, 1.9167, 1.9167, 1.9167, 1.9167,
    1.9167, 1.9167, 1.9167, 1.9167, 1.9167
    ];
