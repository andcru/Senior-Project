var addrow;
var oldid;

$(document).ready(function() {
	$("#sub").click(submitForm);
	addrow = $("table").find("tr:last").html();
	oldid = $("table").find("tr:last").find("td:first").html();
	$("table").find("tr:last").keyup(addRow);
});

function submitForm() {
	var table = [];
	var msg;
	var dead;
	$("table tr[id]:not(:last-child)").each(function(i, tr) {
		var row = [];
		var err;
		$("td[id]",tr).each(function(i,td) {
			if(val = $(td).find("input").val())
				row.push(val);
			else
				err = 1;
		});
		if(row.length && !err)
			table.push(row);
		else if(err && row.length)
			dead = 1;
	});
	if(dead)
		alert("You left cells blank somewhere!");
	else {
		$.ajax({
			type: "POST",
			url: "/data/vars.php",
			data: {
				state: table
			}
		}).done(function(msg) {
			alert(msg);
		});
	}
}

function addRow() {
	var newid = parseInt($(this).find("td:first").html()) + 1;
	var newhtml = addrow.replace(oldid,newid);
	$("table tr:last").after("<tr id='"+newid+"'>"+newhtml+"</tr>");
	$(this).unbind();
	$("table").find("tr:last").keyup(addRow);
}