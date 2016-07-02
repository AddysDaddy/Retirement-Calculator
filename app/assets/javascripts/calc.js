console.log( "Loaded calculator.js" );

$('.nextbtn').click( function(event) {
  $('a[href="' + $(this).data('tab') + '"]').not('.btn').click();
  $('a[href="' + $(this).attr('href') + '"]').not('.btn').click();
});

$('.slider').slider().on('slide', function(event) {
  computeAll();
  $(this).parents('li, div.well').find('span.badgeData').html( $(this).data('slider').getValue() );
}).parents('div.slider').addClass('pull-right');

$('#fieldAge').on('slide', function(event) {
  // Change min
  $('#fieldRetirementAge').data('slider').min = $(this).data('slider').getValue() + 1;
  $('#fieldRetirementAge').data('slider').max = Math.max( 70, $(this).data('slider').getValue() + 10 );
  // Apply setValue to redraw slider
  $('#fieldRetirementAge').slider('setValue', $('#fieldRetirementAge').data('slider').getValue());
  computeAll();
});

$('#fieldRetirementAge').on('slide', function(event) {
  $('#fieldLifeExpectancy').data('slider').min = $(this).data('slider').getValue();
  $('#fieldLifeExpectancy').slider('setValue', $('#fieldLifeExpectancy').data('slider').getValue());
});

$('#fieldROI').on('slide', function(event) {
  $('#investmentOptions div.radio input').prop('checked', false);
});


$('#modalBox').on('show.bs.modal', function (event) {
  var button = $(event.relatedTarget); // Button that triggered the modal
  var modal = $(this);
  var image = button.find('img').attr("src"); // Extract info from data-* attributes
  var title = button.data("title"); // Extract info from data-* attributes
  var cite = button.data("citation"); // Extract info from data-* attributes
  var citelink = button.data("citationlink"); // Extract info from data-* attributes
  modal.find('.modal-title').html(title);
  modal.find('.modal-body img').attr("src", image);
  modal.find('.modal-body .cite a').attr("href", citelink);
  modal.find('.modal-body .cite a').html(cite);
})


/* Social Security Sub-Table */
$('#socialSecurityOptions input').on('change', function (event) {
  var selected = $('#socialSecurityOptions input:checked').parents('div.input-group');
  var selected_input = selected.find('input:text');

  var socialSecurityValue = selected_input.val() ? selected_input.val() : 0;
  $('#fieldSocialSecurity').val( socialSecurityValue );
  $('#fieldSocialSecurityStart').text( selected_input.data('start') );
  $('#fieldSocialSecurity').change();
});

$('#fieldHousingType').on('change', function(event) {
  var option = $(this).find('option:selected');
  var targets = $( '.' + $(option).data('target') );
  console.log( targets );
  targets.hide();
  console.log( $(option).data('show') );
  targets.filter( '.' + $(option).data('show') ).show();
});

/* Investment Options ROI Sub-Table */
$('#investmentOptions div.radio input[type=radio]').change(function (event) {
  var val = $(this).val();
  if( val ) {
    $('#fieldROI').slider('setValue', val);
    $('#fieldROI').parents('li').find('span.badgeData').html( val );
  }
  computeAll();
});

$('.form-control').change( function() {
  computeAll();
});

var computeAll = _.debounce( function() {
  $('div.debug').empty();
  computeIncomeCurve();
  computeNestEgg();
  computeRetirement();
  updateResults();

  drawChart();
}, 500);


/* Income Calculations 
 */
function computeIncomeCurve() {
  var current_age = $('#fieldAge').data('slider').getValue();
  var retirement_age = $('#fieldRetirementAge').data('slider').getValue();
  var lifeExpectancy = $('#fieldLifeExpectancy').data('slider').getValue();
  var annualSavings_pretax = Number($('#fieldSavings').val());
  var annualSavings_aftertax = Number($('#fieldSavings_afterTax').val());
  
  personalizedProfile['currentAge'] = current_age;
  personalizedProfile['curvedIncome'] = [];
  personalizedProfile['takeHomePay'] = [];
  for( var i = current_age; i < retirement_age; i++ ) {
    var curvedIncome = incomeCurve(i);
    personalizedProfile['curvedIncome'].push( curvedIncome );
    
    // Subtract pre-tax retirement savings here
    curvedIncome -=  annualSavings_pretax;

    var afterTaxIncome = IncomeMinusEstimatedTaxes( curvedIncome );

    // Subtract after-tax retirement savings here
    afterTaxIncome -=  annualSavings_aftertax;

    personalizedProfile['takeHomePay'].push( afterTaxIncome );
  }
  for( var i = retirement_age; i <= lifeExpectancy; i++ ) {
    personalizedProfile['curvedIncome'].push( 0 );
  }
  //$('.annualIncomeWithInflation').html( "$ " + Math.round( personalizedProfile['takeHomePay'][0] ).toFixed(0) + " /yr" );
  //$('.monthlyIncomeWithInflation').html( "$ " + Math.round( personalizedProfile['takeHomePay'][0] / 12 ).toFixed(0) + " /mo" );
}

function incomeCurve( target_age ) {
  var current_age = $('#fieldAge').data('slider').getValue();
  var current_income = $('#fieldIncome').val();
  var degree = $('#fieldEducation').val();

  var idx = target_age;
  var idxBase = current_age;

  if( current_age < incomeTrajectoryBaseAge ) {
    idxBase = incomeTrajectoryBaseAge;
  } else if( current_age > incomeTrajectoryMaxAge ) {
    idxBase = incomeTrajectoryMaxAge;
  }
  if( target_age < incomeTrajectoryBaseAge ) {
    idx = incomeTrajectoryBaseAge;
  } else if( target_age >= incomeTrajectoryMaxAge ) {
    idx = incomeTrajectoryMaxAge;
  }
  idx -= incomeTrajectoryBaseAge;
  idxBase -= incomeTrajectoryBaseAge;

  incomeCurveArray = incomeByLTHighSchool;
  switch( degree ) {
    case "Less than High School":
      incomeCurveArray = incomeByLTHighSchool;
      break;
    case "High School":
      incomeCurveArray = incomeByHighSchool;
      break;
    case "Some College / No Degree":
      incomeCurveArray = incomeBySomeCollege;
      break;
    case "Associate's Degree":
      incomeCurveArray = incomeByAssociatesDegree;
      break;
    case "Bachelor's Degree":
      incomeCurveArray = incomeByBachelorsDegree;
      break;
    case "Master's Degree":
      incomeCurveArray = incomeByMastersDegree;
      break;
    case "Doctoral Degree":
      incomeCurveArray = incomeByDoctoralDegree;
      break;
    case "Professional":
      incomeCurveArray = incomeByProfessionalDegree;
      break;
    default:
      console.log( "Error: Unrecognized Degree [" + degree + "]" );
      return -100000;
  }
  var targetAgeIncome = Math.round( current_income * (incomeCurveArray[idx] / incomeCurveArray[idxBase]) * 100) / 100;
  return targetAgeIncome;
}

function IncomeMinusEstimatedTaxes( income ) {
  // Subtract out the federal taxes
  var taxBracket_Fed = taxBrackets_US[$('#fieldFilingStatus option:selected').data('taxbracket')];
  if( !taxBracket_Fed ) { return income; }

  var afterTaxes = income;
  var fedIdx = taxBracket_Fed.length - 1;
  while( income < taxBracket_Fed[fedIdx].incomeBase ) { fedIdx--; }

  afterTaxes -= taxBracket_Fed[fedIdx].rate * (income - taxBracket_Fed[fedIdx].incomeBase);
  afterTaxes -= taxBracket_Fed[fedIdx].taxBase;
  
  // Social Security Tax based on employee contribution: 6.2%
  afterTaxes -= Math.min(income, 118500) * 0.062;
  // Medicare Tax: 1.45%
  afterTaxes -= Math.min(income, 118500) * 0.0145;

  // Subtract out state taxes based on top tax rate
  var taxBracket_State = taxBrackets_State[$('#fieldState option:selected').data('state')];
  if( taxBracket_State ) {
    afterTaxes -= income * taxBracket_State;
  }
  return Math.round( afterTaxes * 100 ) / 100;
}

/* Retirement Calculations 
 */
function RetirementIncomeTargetRateByAge( age ) {
  var curvedIncomeIndexAt60 = 60 - personalizedProfile['currentAge'];
  var inflationRate = 1 + ($('#fieldInflationRate').data('slider').getValue() / 100);

  var targetIncomeCurve = retirementIncomeTarget['HighSpending'];
  if( personalizedProfile['curvedIncome'][curvedIncomeIndexAt60] < (75000 * Math.pow(inflationRate, curvedIncomeIndexAt60)) ) {
    targetIncomeCurve = retirementIncomeTarget['MidSpending'];
  } 
  if( personalizedProfile['curvedIncome'][curvedIncomeIndexAt60] < (37500 * Math.pow(inflationRate, curvedIncomeIndexAt60)) ) {
    targetIncomeCurve = retirementIncomeTarget['LowSpending'];
  } 

  var target = 1;
  if( age >= retirementIncomeTargetMaxAge ) {
    var inflation = Math.pow(retirementIncomeOldAgeRequirementFactor, age - retirementIncomeTargetMaxAge);
    target = inflation * targetIncomeCurve[(retirementIncomeTargetMaxAge - retirementIncomeTargetBaseAge) / retirementIncomeTargetSpacing];
  } else if( age > retirementIncomeTargetBaseAge ) {
    var index = Math.floor( (age - retirementIncomeTargetBaseAge) / retirementIncomeTargetSpacing );
    var remainder = age % retirementIncomeTargetSpacing;
    target = ((retirementIncomeTargetSpacing - remainder) * targetIncomeCurve[index] + remainder * targetIncomeCurve[index+1]) / retirementIncomeTargetSpacing;
  }
  return target;
}

function computeNestEgg() {
  var current_nestEgg = $('#fieldNestEgg').val();
  var investmentROI = 1 + ($('#fieldROI').data('slider').getValue() / 100);
  var annualSavings = Number($('#fieldSavings').val());
  var annualSavings_aftertax = Number($('#fieldSavings_afterTax').val());
  var annualContributions = Number($('#fieldContributions').val());

  var current_age = $('#fieldAge').data('slider').getValue();
  var retirement_age = $('#fieldRetirementAge').data('slider').getValue();
  var lifeExpectancy = $('#fieldLifeExpectancy').data('slider').getValue();
  var socialSecurity_start = parseInt( $('#fieldSocialSecurityStart').text() );
  var socialSecurity_income = parseFloat( $('#fieldSocialSecurity').val() ) * 12;

  personalizedProfile['nestEgg'] = [ current_nestEgg ];
  personalizedProfile['retirementIncome'] = [undefined];
  var i = current_age + 1;
  while( i < retirement_age ) {
    current_nestEgg = current_nestEgg * investmentROI;
    current_nestEgg += annualSavings;
    current_nestEgg += annualSavings_aftertax;
    current_nestEgg += annualContributions;
    current_nestEgg = Math.round( current_nestEgg * 100 ) / 100;
    personalizedProfile['nestEgg'].push( current_nestEgg );
    if( i >= socialSecurity_start ) { 
      personalizedProfile['retirementIncome'].push( socialSecurity_income );
    } else {
      personalizedProfile['retirementIncome'].push( undefined );
    }
    i++;
  }
}

function computeRetirement() {
  var current_age = $('#fieldAge').data('slider').getValue();
  var retirement_age = $('#fieldRetirementAge').data('slider').getValue();
  var lifeExpectancy = $('#fieldLifeExpectancy').data('slider').getValue();
  var retirementROI = 1 + ($('#fieldRetirementROI').data('slider').getValue() / 100);
  var inflationRate = 1 + ($('#fieldInflationRate').data('slider').getValue() / 100);

  var current_nestEgg = personalizedProfile['nestEgg'][personalizedProfile['nestEgg'].length - 1];
  var withdrawal_initial = calcAnnualRetirementIncome(current_nestEgg);
  //$('.annualRetirementIncomeWithInflation').html( "$" + Math.round( withdrawal_initial / Math.pow( inflationRate, retirement_age - current_age ) ).toFixed(0) + "/yr" );
  //$('.monthlyRetirementIncomeWithInflation').html( "$" + Math.round( withdrawal_initial / Math.pow( inflationRate, retirement_age - current_age ) / 12 ).toFixed(0) + "/mo" );

  var socialSecurity_start = parseInt( $('#fieldSocialSecurityStart').text() );
  var socialSecurity_income = parseFloat( $('#fieldSocialSecurity').val() ) * 12 || 0;

  var i = retirement_age;
  var budgetMin = Infinity;
  var budgetMax = -Infinity;
  personalizedProfile['yearsToRetirement'] = retirement_age - current_age;
  while( i <= lifeExpectancy ) {
    var withdrawal = Math.round(withdrawal_initial * RetirementIncomeTargetRateByAge(i) * Math.pow( inflationRate, i - retirement_age ) * 100)/100;

    if( withdrawal > current_nestEgg ) {
      withdrawal = current_nestEgg;
    }
    current_nestEgg -= withdrawal;
    var retirementIncome = Math.round( withdrawal / Math.pow( inflationRate, i - current_age ) * 100)/100;

    if( i >= socialSecurity_start ) {
      retirementIncome += socialSecurity_income;
    }

    current_nestEgg = Math.round( current_nestEgg * retirementROI * 100 ) / 100;
    personalizedProfile['nestEgg'].push( current_nestEgg );
    personalizedProfile['retirementIncome'].push( retirementIncome );

    i++;
  }
  //$('.annualRetirementIncomeWithInflation').html( "$ " + Math.round( personalizedProfile['retirementIncome'][personalizedProfile['yearsToRetirement']] ).toFixed(0) + " /yr" );
  //$('.monthlyRetirementIncomeWithInflation').html( "$ " + Math.round( personalizedProfile['retirementIncome'][personalizedProfile['yearsToRetirement']] / 12 ).toFixed(0) + " /mo" );
}

function calcAnnualRetirementIncome( current_nestEgg ) {
  var withdrawalRate = $('#fieldWithdrawalRate').data('slider').getValue() / 100;
  return Math.round( current_nestEgg * withdrawalRate * 100 ) / 100;
}

function updateResults() {
  var hasMortgage = $('#fieldHousingType option:selected').data('show') == 'housingMortgage';
  var livingBudget = personalizedProfile['takeHomePay'][0] - 12 * parseFloat($('#fieldHousingPayment').val());
  var current_budget = personalizedProfile['takeHomePay'][0];
  if( hasMortgage ) {
    current_budget -= 12 * parseFloat($('#fieldHousingPayment').val());
  }

  var annualIncomeWithInflation = Math.round( current_budget ).toFixed(0);
  var monthlyIncomeWithInflation = Math.round( current_budget / 12 ).toFixed(0);
  var annualRetirementIncomeWithInflation = Math.round( personalizedProfile['retirementIncome'][personalizedProfile['yearsToRetirement']] ).toFixed(0);
  var monthlyRetirementIncomeWithInflation = Math.round( personalizedProfile['retirementIncome'][personalizedProfile['yearsToRetirement']] / 12 ).toFixed(0);

  $('.annualIncomeWithInflation').html( "$ " + annualIncomeWithInflation + " /yr" );
  $('.monthlyIncomeWithInflation').html( "$ " + monthlyIncomeWithInflation + " /mo" );
  $('.annualRetirementIncomeWithInflation').html( "$ " + annualRetirementIncomeWithInflation + " /yr" );
  $('.monthlyRetirementIncomeWithInflation').html( "$ " + monthlyRetirementIncomeWithInflation + " /mo" );

  var annualDifference = Math.abs( annualIncomeWithInflation - annualRetirementIncomeWithInflation );
  var monthlyDifference = Math.abs( monthlyIncomeWithInflation - monthlyRetirementIncomeWithInflation );
  $('.annualDifference').html( "$ " + annualDifference + " /yr" );
  $('.monthlyDifference').html( "$ " + monthlyDifference + " /mo" );
  $('#result_retirementbudget,#result_budgetcomparison').removeClass("panel-danger panel-warning panel-success").removeClass("text-danger text-warning text-success");
  $('.budget_difference').removeClass("text-danger text-warning text-success");
  $('.budget_notenough,.budget_barelyenough,.budget_enough').hide();
  if( monthlyRetirementIncomeWithInflation < monthlyIncomeWithInflation ) {
    // Retirement budget is short
    $('#result_retirementbudget,#result_budgetcomparison').addClass("panel-danger text-danger");
    $('.budget_notenough').show();
    $('.budget_difference').addClass("text-danger");
  } else if ( monthlyRetirementIncomeWithInflation < 1.1 * monthlyIncomeWithInflation ) {
    // Retirement budget is close, and can use a bigger buffer
    $('#result_retirementbudget,#result_budgetcomparison').addClass("panel-warning text-warning");
    $('.budget_barelyenough').show();
    $('.budget_difference').addClass("text-warning");
  } else {
    // Retirement budget looks good!
    $('#result_retirementbudget,#result_budgetcomparison').addClass("panel-success text-success");
    $('.budget_enough').show();
    $('.budget_difference').addClass("text-success");
  }
}

/* Charting Functions
 */
$(function() {
  google.charts.load('current', {packages: ['corechart']});
  google.charts.setOnLoadCallback(computeAll);
});

var chartObj = undefined;
function drawChart() {
  var current_age = $('#fieldAge').data('slider').getValue();
  var hasMortgage = $('#fieldHousingType option:selected').data('show') == 'housingMortgage';

  var headings = ['Age', 'Income', 'Savings', 'Retirement Income', 'Approx. Take Home Pay']
  if( hasMortgage ) {
    headings.push( 'Living Budget' );
  }
  var graphArray = [headings];
  var ageBroke = 0;
  for( var i = 0; i < personalizedProfile['nestEgg'].length; i++ ) {
    var curvedIncome = personalizedProfile['curvedIncome'][i] + 0;
    if( !curvedIncome ) {
      curvedIncome = undefined;
    }
    var nestEgg_remaining = Math.max( parseInt(personalizedProfile['nestEgg'][i]), 0 );
    if( nestEgg_remaining == 0 && !ageBroke ) {
      ageBroke = current_age + i;
    }
    var retirementIncome = personalizedProfile['retirementIncome'][i] + 0;
    var takeHomePay = personalizedProfile['takeHomePay'][i];

    var row = [ (current_age + i)+"", 
                Math.floor( curvedIncome ), 
                nestEgg_remaining,
                Math.floor( retirementIncome ), 
                Math.floor( takeHomePay ), 
              ];
    if( hasMortgage ) {
      var paidOffIn = $('#fieldHousingPaidOff').data('slider').getValue();
      var totalBudget = Math.floor( takeHomePay ? takeHomePay : 0 ) + Math.floor( retirementIncome ? retirementIncome : 0 );
      var livingBudget = totalBudget - 12 * parseFloat($('#fieldHousingPayment').val());
      if( i > paidOffIn ) {
        row.push( undefined );
      } else {
        row.push( livingBudget );
      }
    }
    graphArray.push( row );
  }
  $('#uhoh_box').hide();
  $('.savings_notenough').hide();
  $('.savings_enough').show();
  $('#savings_status').removeClass('bg-danger bg-success').addClass('bg-success');
  if( ageBroke ) {
    $('#uhoh_box,#result_agebroke').show().find('span').html( ageBroke );
    $('.savings_notenough').show();
    $('.savings_enough').hide();
    $('#savings_status').removeClass('bg-success').addClass('bg-danger');
  }

  var chartData = google.visualization.arrayToDataTable(graphArray);

  var options = {
    curveType: 'function',
    legend: { position: 'bottom' },
    series: { 0: {
                color: 'lightgrey',
                visibleInLegend: false,
                targetAxisIndex: 0,
                type: 'line'
              },
              1: {
                color: 'lime',
                targetAxisIndex: 1,
                type: 'line'
              },
              2: {
                color: 'red', // TODO Choose color based on retirement status
                curveType: 'none',
                targetAxisIndex: 0,
                type: 'line'
              },
              3: {
                color: 'darkgreen',
                targetAxisIndex: 0,
                type: 'line'
              }
    },
    vAxes: {
      0: {
        title:'Income',
        format: "$#,###",
        viewWindow:{
          min: 0
        }
      },
      1: {
        title:'Savings',
        format: "$#,###",
        viewWindow:{
          min: 0
        }
      }
    }
  };

  if( !chartObj ) {
    chartObj = new google.visualization.ComboChart(document.getElementById('nestEggChart'));
  }

  chartObj.draw(chartData, options);
};

/* jQuery Add-Ons
 */
$.fn.AddCommasToNumbers = function(){ 
    return this.each(function(){ 
        $(this).text( $(this).text().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") ); 
    })
}


/* Data Object
 */
var personalizedProfile = {
  curvedIncome: [],
  takeHomePay: [],
  retirementIncome: [],
  nestEgg: []
};

