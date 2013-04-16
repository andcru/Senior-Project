// STORY: On connecting to server, server returns an object.
// This object contains the contents of each of the config tables, in full
var socket = io.connect('/');

socket.on('return_runs', function(data) {
    console.log(data);
    for(var k in data) {
        console.log(data[k]);
        $("#select_run").append($('<option/>', {value: data[k].id, text: data[k].title+" ("+data[k].starttime.replace("T"," ").replace(".000Z","")+")"}));
    }
});

$(document).ready(function(){
    socket.emit('get_runs','1');
    $("#select_run").change(changeButtons);
    $("#download_data").click(downloadData);
});

function downloadData() {
    if(!$(this).hasClass('disabled'))
        document.getElementById('download_link').click();
}

function changeButtons() {
    if($(this).val() > 0) {
        $("#download_link").attr('href','/runs/'+$(this).val()+'.csv');
        $(".data_see").removeClass('disabled');
    }
    else
        $(".data_see").addClass('disabled');
}