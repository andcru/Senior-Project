$(document).ready(function(){
	$("#state").click(changeState);
});

function changeState() {
	var text = $(this).html();
	var dur = $("#dur").val();
	$.ajax({
		type: "POST",
		url: "/data/state.php",
		data: {
			state: text,
			dur: dur
		}
	}).done(function(msg) {
		if(text == 'Start') {
			$("#state").html("Stop");
			setTimeout(function() {
				$("#state").html("Start");
			},dur*60*1000);
		}
		else
			$("#state").html("Start");
	});
}