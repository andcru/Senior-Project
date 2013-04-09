$(document).ready(function(){
	$(".selectpicker").each(function(k){
		$(this).after($.sprintf('<div class="dropdown"><button class="btn btn-block dropdown-toggle" data-toggle="dropdown" id="%s"></button><ul class="dropdown-menu" role="menu"></ul</div>', $(this).attr('id')));
		$("#"+$(this).attr('id')).remove();
	});
});