

var glob_data;
var glob_prevs;
/*
DEFINE CLASS SESSION DATA TO STORE AND RETRIEVE RUNS.
Data structure
session ---- scenarios ---- ---- ---- params
                       ----      ---- label
                       ----      ---- stats   ----  ts
                       ----                   ----  doses
                       ----                   ----  prev_reds
                       ----                   ----  num_rounds
                       ----
                       ----      ---- results ----  ---- ---- Ws
                       ----                   ----       ---- Ms
                       ----                   ----       ---- ts
                                              ----       ---- doses
                                                         ---- Ls


*/
function SessionData(){}

SessionData.storeResults =  function(results,scenLabel,stats){
  //takes results: an Array of json with each json obj having ts, Ms, Ws.
  //combines these with parameter information and stores to be retrieved whenever.
  var sessionData = JSON.parse(localStorage.getItem('sessionData')); //retrieve session dat from storage.
  if ( (sessionData == null) || (sessionData.scenarios == null) ){
    sessionData = {'scenarios':[]};
  }
  if(scenLabel==null){
    scenLabel = 'Scenario ' + (ScenarioIndex.getIndex()+1);
  }
  var scenario = {'params': params,'results' : results, 'label' : scenLabel};
  var scenInd = ScenarioIndex.getIndex();

  sessionData.scenarios[scenInd] = scenario;
  toStore = JSON.stringify(sessionData);
  localStorage.setItem('sessionData', toStore);
  return sessionData;

}

SessionData.storeSession = function(session){
  toStore = JSON.stringify(session);
  localStorage.setItem('sessionData', toStore);
}

SessionData.storeStats = function(stats){
  var sessionData = JSON.parse(localStorage.getItem('sessionData')); //retrieve session dat from storage.
  var scenInd = ScenarioIndex.getIndex();
  sessionData.scenarios[scenInd]['stats'] = stats;
  toStore = JSON.stringify(sessionData);
  localStorage.setItem('sessionData', toStore);
}

SessionData.createNewSession = function(){
  var sessionData = JSON.parse(localStorage.getItem('sessionData'));
  if ( (sessionData == null) || (sessionData.scenarios == null) ){
    sessionData = {'scenarios':[]};
  }
  var scenario = {'params': params,'results' : []};
  var scenInd = ScenarioIndex.getIndex();

  sessionData.scenarios[scenInd] = scenario;
  toStore = JSON.stringify(sessionData);

}

SessionData.deleteSession = function(){
  //delete session data to start fresh when page loads.
  localStorage.setItem('sessionData', null);
}



SessionData.retrieveSession = function(){
  var ses = JSON.parse(localStorage.getItem('sessionData'));
  if (ses && ses.scenarios && ses.scenarios[0] && ses.scenarios[0].label){
    return ses
  } else {
    ses = {'scenarios':[]};
    toStore = JSON.stringify(ses);
    localStorage.setItem('sessionData', toStore);
    return ses
  }
}
SessionData.numScenarios = function(){
  var ses = SessionData.retrieveSession();
  if ( (ses == null) || (ses.scenarios == null) ){
    return 0;
  } else {
    return ses.scenarios.length;
  }
}
SessionData.convertRun = function(m,endemicity){
  //convert model object to JSON for run.
 return {'ts' : m.ts, 'Ms' : m.Ms, 'Ws': m.Ws, 'Ls': m.Ls,
 'reductionYears':m.reductionYears(),'nRounds' : m.nRounds(),
         'endemicity':endemicity}
}

SessionData.nRounds = function(i){
  var ses = SessionData.retrieveSession();
  var scen = ses.scenarios[i];
  var n = scen.results.length;
  var rounds = [];
  for (var j = 0; j < n; j++){
    rounds.push(scen.results[j].nRounds);
  }
  return rounds;
}

SessionData.reductions = function(i,yr,endemicity){
  var ses = SessionData.retrieveSession();
  var scen = ses.scenarios[i];
  var n = scen.results.length;
  red = 0;
  var nn = 0;
  for (var j = 0; j < n; j++){
    if(endemicity){
      if (scen.results[j].endemicity == endemicity){
        red += scen.results[j].reductionYears[yr];
        nn += 1;
      }
    }else{
      red += scen.results[j].reductionYears[yr];
      nn += 1;
    }
  }
  return red/nn;
}

SessionData.ran = function(i){
  var ses = SessionData.retrieveSession();

  if(!ses){ return false }
  if(!ses.scenarios[i]){ return false }

  var res = ses.scenarios[i].results;
  if(res.length>0){
    return true
  } else {
    return false
  }
}
SessionData.deleteScenario = function(){
  var ind = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  ses.scenarios.splice(ind,1);
  var toStore = JSON.stringify(ses);
  localStorage.setItem('sessionData', toStore);
  ScenarioIndex.setIndex(0);

}
/*
functions for retrieving current scenario index
*/
function ScenarioIndex(){}
ScenarioIndex.getIndex = function(){
  return Number(localStorage.getItem('scenarioIndex'));
}
ScenarioIndex.setIndex = function(ind){
  try{
    var ses = SessionData.retrieveSession();
    var scen = ses.scenarios[ind];
    params = scen.params;
    $('#scenario-title').html(ses.scenarios[ind].label + ' Overview');
  }catch(err){}

  return localStorage.setItem('scenarioIndex',ind);
}
/*
Specific mapping functions
*/
function clearSession(){
  bootbox.confirm("Are you sure you want to delete this session? This will remove all scenarios.", function(result) {
    if(result){
      SessionData.deleteSession();
      createScenarioBoxes();
      scenarioComparisonSelectVisibility();
      drawComparisonPlot();
      drawScenarioPlot();
      $('#scenario-title').html('Scenario Overview');
    }
  });
}

function scenarioComparisonSelectVisibility(){
  var ses = SessionData.retrieveSession();
  var n = (ses && ses.scenarios)? ses.scenarios.length : 0;
  if (n>0){
    $('#sel-comp-stat-div').show();
  } else {
    $('#sel-comp-stat-div').hide();
  }
}
function scenarioRunStats(){
  var scenInd = ScenarioIndex.getIndex();
  var scenario = SessionData.retrieveSession()['scenarios'][scenInd];
  var dfrd = $.Deferred();
  var ts = [],dyrs=[],ryrs=[];


      var ts = scenario['results'][0]['ts'];
      var dyrs = [];


      var stats = reductionStatsCalc(scenario,params.covMDA);

      dyrs = stats.doses;
      ryrs= stats.reduction;

      console.log(ts);
      console.log(dyrs);
      SessionData.storeStats({'ts': ts,'prev_reds' : ryrs,'doses':dyrs, 'Ws': stats.medW, 'Ms': stats.medM, 'Ls': stats.medL });
      drawComparisonPlot();



}
function createScenarioBoxes(){
  var ses = SessionData.retrieveSession();
  var curScen = ScenarioIndex.getIndex();
  n = (ses && ses.scenarios)? ses.scenarios.length : 0;
  d3.select('#scenario-button-group').html('');
  if(n>0){
    d3.select('#scenario-button-group').append('h4')
    .html('Select scenario to plot:');
  }
  for(var i=0;i<n;i++){
    d3.select('#scenario-button-group').append('div')
      .attr('class','btn btn-primary btn-lg btn-block '.concat((i==curScen)? 'active':''))
      .attr('id','scenario-button-'+i)
      .attr('data-scenario-label',ses.scenarios[i].label)
      .attr('data-scenario',i)
      .attr('aria-pressed',(i==curScen))
      .html(ses.scenarios[i].label)
      .on('click',function(){
        ScenarioIndex.setIndex($('#'+this.id).data('scenario'));
        drawScenarioPlot();
        setmodelParams();
        fixInput();
        $('#close_scenario').html('show scenario');
        $('#scenario-messages').html('<div class="alert alert-success alert-dismissible" role="alert">  '
        + $('#'+this.id).data('scenario-label')
        + ' set </div>');
        $(this).addClass("active").siblings().removeClass("active");
        $('#download').removeClass('hidden');
        $('#delete_scenario').removeClass('hidden').unbind().click(function(){
          bootbox.confirm("Are you sure you want to delete this scenario?", function(result) {
            if(result){
              SessionData.deleteScenario();
              createScenarioBoxes();
              scenarioComparisonSelectVisibility();
              drawComparisonPlot();
              drawScenarioPlot();
              $('#settings-modal').modal('hide');
            }
          });
        });
        $('#settings-modal').modal('show');

        if(SessionData.ran(i)){
          $('#run_scenario').html('Display Scenario');
        }else{
          $('#run_scenario').html('Run Scenario');
        }
      });
  }
  if (n>0){
    d3.select('#scenario-button-group').append('div').attr('class','divider');
    d3.select('#scenario-button-group').append('div')
    .attr('class','btn btn-danger btn-lg btn-block ')
    .html('Clear Session')
    .on('click',clearSession);
  }

}

function drawScenarioPlot(){
  var scenInd = ScenarioIndex.getIndex();
  var results = SessionData.retrieveSession()['scenarios'][scenInd];
  var option = $( "#sel-stat" ).val();
  if(results){
    if(option =="mf"){
      timeSeriesPlot('microfilaraemia','mf prevalence (%)','Ms');
    }else if (option=="ICT"){
      timeSeriesPlot('antigenaemia','antigen prevalence (%)','Ws');
    }else if(option=="L3"){
      timeSeriesPlot('L3 prevalence','larval prevalence in mosquito (%)','Ls');
    }
  } else {
    Plotly.newPlot('map', [], [],{displayModeBar: false, staticPlot: true});
  }
}

function timeSeriesPlot(title,y_title,stat){
  var data = [];
  var scenInd = ScenarioIndex.getIndex();
  var res = SessionData.retrieveSession()['scenarios'][scenInd]['results'];
  var med = SessionData.retrieveSession()['scenarios'][scenInd]['stats'][stat];
  var n = res.length;
  for(var i=0; i<n; i++){
    trace = {
      type: 'scatter',
      x: res[i]['ts'],
      y: res[i][stat],
      mode: 'lines',
      name: 'Blue',
      line: {
        color: 'rgb(200, 200, 200)',
        width: 1,
        opacity: 0.3
      }
    };
    data.push(trace);
  }
  trace = {
    type: 'scatter',
    x: res[0]['ts'],
    y: med,
    mode: 'lines',
    name: 'Blue',
    line: {
      color: 'rgb(0, 0, 200)',
      width: 2,
      opacity: 1.0
    }
  };
  data.push(trace);

  if((stat=='Ms')||(stat=='Ws')){
    var tval = (stat=='Ms')? 1.0:2.0;
    var trace = {
      x: res[0]['ts'],
      y: Array.apply(null, {length: res[0]['ts'].length}).map(Number.call, function(){return tval;}),
      mode: 'lines',
      name: 'dot',
      line: {
        color: 'rgb(0, 0, 0)',
        dash: 'dot',
        width: 4
      }
    };
    data.push(trace);
  }

  var layout = { //main layout format for plot.ly chart
    autosize: true,
    showlegend: false,
    title: title,
    xaxis: {
      title: 'time since start of intervention (yrs)',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: y_title,
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };


  Plotly.newPlot('map', data, layout,{displayModeBar: false, staticPlot: true});
}

function drawComparisonPlot(){
  var ses = SessionData.retrieveSession();
  if (ses.scenarios.length > 0){
    var option = $('#sel-comp-stat').val();
    if (option=="doses"){
      drawDosesTimeLine();
    }else if (option=="rounds"){
      drawMapBoxPlot();
    } else if(option=="prev"){
      drawPrevalenceTimeLine();
    }
  } else {
    Plotly.newPlot('map-boxplot',[], {height:10,width:10},{displayModeBar: false});
  }
}

function drawDosesTimeLine(){ //TODO: fix this function.
  var orgScenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  var n = ses.scenarios.length;
  var traces = [];
  var cLow,cMedium,cHigh;
  var timeline_plot_layout = { //main layout format for plot.ly chart
    autosize: true,
    title: 'Doses per year',
    xaxis: {
      title: 'time since start of intervention (yrs)',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: 'doses per 100,000',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };


    for (var scenInd = 0; scenInd < n; scenInd ++)
    {
      var ts = ses.scenarios[scenInd].stats.ts;
      var dyrs = ses.scenarios[scenInd].stats.doses;


      var trace = {
        x: ts,
        y: dyrs,
        mode: 'lines+markers',
        name: ses.scenarios[scenInd].label
      };
      traces.push(trace);

    }
    console.log(traces);
    Plotly.newPlot('map-boxplot', traces, timeline_plot_layout, {displayModeBar: false});
    ScenarioIndex.setIndex(orgScenInd);




}

function drawPrevalenceTimeLine(){
  var orgScenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  var n = ses.scenarios.length;
  var traces = [];
  var cLow,cMedium,cHigh;
  var timeline_plot_layout = { //main layout format for plot.ly chart
    autosize: true,
    title: 'Reduction in Prevalence (%)',
    xaxis: {
      title: 'time since start of intervention (yrs)',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: 'Reduction in prevalence (%)',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };


    for (var scenInd = 0; scenInd < n; scenInd ++)
    {
      var ts = ses.scenarios[scenInd].stats.ts;
      var dyrs = ses.scenarios[scenInd].stats.prev_reds;
      var trace = {
        x: ts,
        y: dyrs,
        mode: 'lines+markers',
        name: ses.scenarios[scenInd].label
      };
      traces.push(trace);

    }

    Plotly.newPlot('map-boxplot', traces, timeline_plot_layout, {displayModeBar: false});
    ScenarioIndex.setIndex(orgScenInd);




}

function drawMapBoxPlot(){
  var ses = SessionData.retrieveSession();
  var n = ses.scenarios.length;
  var traces = [];
  for (var i = 0; i <n; i++){
    var trace = {
      y: SessionData.nRounds(i),
      type: 'box',
      name: ses.scenarios[i].label
    };
    traces.push(trace);
  }
  var box_plot_layout = { //main layout format for plot.ly chart
    autosize: true,
    title: 'No. rounds to below 1% microfilariaemia',
    xaxis: {
      title: '',
      showgrid: false,
      zeroline: false
    },
    yaxis: {
      title: 'No. rounds',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };

  Plotly.newPlot('map-boxplot', traces, box_plot_layout, {displayModeBar: false});
}


function median(values) {

    values.sort( function(a,b) {return a - b;} );

    var half = Math.floor(values.length/2);

    if(values.length % 2)
        return values[half];
    else
        return (values[half-1] + values[half]) / 2.0;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function runMapSimulation(){
  setInputParams({'nMDA':40});
  var scenLabel = $('#inputScenarioLabel').val();
   //max number of mda rounds even if doing it six monthly.
  var maxN = Number($('#runs').val());
  var runs = [];
  var progression = 0;
  fixInput();
  $('#map-progress-bar').css('width','0%');
  $('#map-progress-bar').show();
  var progress = setInterval(function()
  {

    $('#map-progress-bar').css('width',Number(progression*100/maxN)+'%');
    var m = new Model(800);
    m.evolveAndSaves(120.0);
    runs.push(SessionData.convertRun(m,endemicity));
    $('#roundsTest').html(progression*100/maxN + '%');
    if(progression == maxN) {
      $('#map-progress-bar').hide();
      clearInterval(progress);
      SessionData.storeResults(runs,scenLabel);
      scenarioRunStats();
      createScenarioBoxes();
      scenarioComparisonSelectVisibility();
      drawScenarioPlot();
      $('#scenario-title').html(scenLabel + ' Overview');
      $('#settings-modal').modal('hide');


    } else {
      progression += 1;
    }
  }, 10);
}

function reductionStatsCalc(scenario,coverage){
  var n = scenario['results'].length;
  var T = scenario['results'][0]['ts'].length;
  var prev0;
  var totR= new Array(T);
  var doses = new Array(T);
  var medM = new Array(T);
  var medW = new Array(T);
  var medL = new Array(T);
  var doses_year = (params.mdaFreq==6)? 2 : 1;
  for (var t=0; t<T; t++){
    totR[t] = 0;
    doses[t]=0;
    mM =[],mW = [], mL = [];
    for (var i = 0; i<n; i++){
      prev0 = prev = scenario['results'][i]['Ms'][0];
      red = scenario['results'][i]['Ms'][t]/prev0;
      prev = scenario['results'][i]['Ms'][t];
      mM.push(scenario['results'][i]['Ms'][t]);
      mW.push(scenario['results'][i]['Ws'][t]);
      mL.push(scenario['results'][i]['Ls'][t]);
      totR[t] += red;
      if(prev>1.0) doses[t] += 100000*coverage*doses_year;
    }
    totR[t] = (1- totR[t]/n)*100.0;
    doses[t] = doses[t]/n;
    medM[t] = median(mM);
    medW[t] = median(mW);
    medL[t] = median(mL);
  }

  return {'reduction': totR,'doses' : doses, 'medM' : medM, 'medW' : medW, 'medL' : medL};
}



function modalConfirmation(i){
  if (SessionData.ran(i)){
    ScenarioIndex.setIndex(i);
    $('#settings-modal').modal('hide');

  } else {
    runSimClick();
  }
}

function addScenarioButton(){
  //TODO: add length of scenarios function.
  var i = SessionData.numScenarios();
  ScenarioIndex.setIndex(i);
  SessionData.createNewSession();
  $('#scenario-messages').html('');
  $('#delete_scenario').addClass('hidden');
  $('#download').addClass('hidden');
  $('#settings-modal').modal('show');
  $('#close_scenario').html('close');
  fixInput(false);
}

function runSimClick(){
  runMapSimulation();
}

function changeLabel(){
  var lab = $('#inputScenarioLabel').val();
  var scenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  ses['scenarios'][scenInd]['label'] = lab;
  SessionData.storeSession(ses);
  createScenarioBoxes();
  scenarioComparisonSelectVisibility();
  drawComparisonPlot();
  drawScenarioPlot();
  $('#scenario-label-button').hide();
  $('#scenario-title').html(lab+' Overview');
  $('#scenario-messages').html('<div class="alert alert-success alert-dismissible" role="alert">  '
  + lab
  + ' set </div>');
}


function fixInput(fix_input){
  var curScen = ScenarioIndex.getIndex();
  if (fix_input == null){
    fix_input = true;
  }
  if (fix_input){
    $('#MDACoverage').slider('disable');
    $('#bedNetCoverage').slider('disable');
    $('#insecticideCoverage').slider('disable');
    $('#Microfilaricide').slider('disable');
    $('#Macrofilaricide').slider('disable');
    $('#runs').slider('disable');
    $('#run_scenario').hide();
    $('input:radio[name=mdaSixMonths]').attr('disabled',true);
    $('input:radio[name=mdaRegimenRadios]').attr('disabled',true);
    //$('#inputScenarioLabel').attr('disabled',true);
    $('input:radio[name=speciesRadios]').attr('disabled',true);
    $('#endemicity').slider('disable');
    $('#labelEditable').attr('is',true);
  } else {
    $('#runs').slider('enable');
    $('#MDACoverage').slider('enable');
    $('#bedNetCoverage').slider('enable');
    $('#insecticideCoverage').slider('enable');
    $('#Microfilaricide').slider('enable');
    $('#Macrofilaricide').slider('enable');
    $('#endemicity').slider('enable');
    $('#run_scenario').show();
    $('input:radio[name=mdaSixMonths]').attr('disabled',false);
    $('input:radio[name=mdaRegimenRadios]').attr('disabled',false);
    $('#inputScenarioLabel').attr('disabled',false).val('Scenario '+(curScen+1));
    $('input:radio[name=speciesRadios]').attr('disabled',false);
    $('#labelEditable').attr('is',false);

  }
  if($("input[name=mdaRegimenRadios]:checked").val()==5){
    $('#custom-regimen-sliders').show();
  } else{
    $('#custom-regimen-sliders').hide();
  }
  $('#scenario-label-button').hide();
}
function setmodelParams(fixInput){
  if (fixInput == null){
    fixInput = false;
  }
  var scenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  var ps = ses.scenarios[scenInd].params.inputs;
  $('#inputScenarioLabel').val(ses.scenarios[scenInd].label);
  $("#inputMDARounds").val(ps.mda);
  $('#runs').slider('setValue',Number(ps.runs));
  $('#MDACoverage').slider('setValue', Number(ps.coverage));
  $('#endemicity').slider('setValue',Number(ps.endemicity));
  $('#bedNetCoverage').slider('setValue',Number(ps.covN));
  $('#insecticideCoverage').slider('setValue', Number(ps.v_to_hR));
  $('input:radio[name=mdaSixMonths]').filter('[value='+ps.mdaSixMonths +']').prop('checked', true);
  $('input:radio[name=mdaRegimenRadios]').filter('[value='+ps.mdaRegimen +']').prop('checked', true);
  $('input:radio[name=speciesRadios]').filter('[value='+ps.species +']').prop('checked', true);
  $('#Microfilaricide').slider('setValue',Number(ps.microfilaricide));
  $('#Macrofilaricide').slider('setValue',Number(ps.macrofilaricide));
  return {"mda" : $("#inputMDARounds").val(), "mdaSixMonths" : $("input:radio[name=mdaSixMonths]:checked").val(),
      "endemicity" : $('#endemicity').val(), "coverage": $("#MDACoverage").val(),
      "covN" : $('#bedNetCoverage').val(), "v_to_hR" : $('#insecticideCoverage').val(),
      "vecCap" : $('#vectorialCapacity').val(), "vecComp" : $('#vectorialCompetence').val(),
      "vecD" : $('#vectorialDeathRate').val(), "mdaRegimen" : $("input[name=mdaRegimenRadios]:checked").val(),
      "sysComp" : $('#sysAdherence').val(), "rhoBComp" : $('#brMda').val(), "rhoCN"  : $('#bedNetMda').val(),
      "species" : $("input[name=speciesRadios]:checked").val(),
      "macrofilaricide" : $('#Macrofilaricide').val(), "microfilaricide" : $('#Microfilaricide').val()
    }
}

function download(){
  var label = SessionData.retrieveSession()['scenarios'][ScenarioIndex.getIndex()]['label'];
  var res = SessionData.retrieveSession()['scenarios'][ScenarioIndex.getIndex()]['results'];
  var headers = ["ts","run","microfilaraemia","antigenaemia","mosquito prevalence"].join(",");
  var csvContent = "data:text/csv;charset=utf-8,"+headers+"\n";
  res.forEach(function(infoArray, index){
    infoArray['ts'].forEach(function(val,iindex){
      dataString = infoArray['ts'][iindex] + "," +index+","+infoArray['Ms'][iindex]+","+infoArray['Ws'][iindex]+","+infoArray['Ls'][iindex];
      csvContent += dataString+ "\n";
    });
  });
  var encodedUri = encodeURI(csvContent);
  //window.open(encodedUri);

  var link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", label+".csv");
  document.body.appendChild(link); // Required for FF

  link.click();
}

$(document).ready(function(){
  //first remove previous session data.
  //SessionData.deleteSession();
  var width = $('#map').width(), height=350;
  ScenarioIndex.setIndex(0);
  createScenarioBoxes();
  scenarioComparisonSelectVisibility();
  drawComparisonPlot();
  drawScenarioPlot();
  $('#map-progress-bar').hide();
  $('#sel-comp-stat').change(drawComparisonPlot);
  $('#sel-stat').change(drawScenarioPlot);
  $('#add-new-scenario').on('click',addScenarioButton);
  $('#run_scenario').on('click',modalConfirmation);

  $('#inputScenarioLabel').on('input',function(){
    if($('#labelEditable').attr('is')=="true"){
      $('#scenario-label-button').show();
    }
  });
  $('#scenario-label-button').on('click',changeLabel);
  $('#download').on('click',download);






  //d3.csv('/assets/ETH_prev.csv',function(d){ glob_prevs = d}); // for debugging purposes.



});
