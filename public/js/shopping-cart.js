$(function(){
  var prod_form  = $('#prod_form')
  var code_input = $('#code_input')

  $('div.buy').click(function(){
    var box = $(this)
    code_input.val(box.attr('id'))
    prod_form.submit()
  })

  enableRemoveEvent();
})

function enableRemoveEvent(){
  $('td.remove').click(function(){
    var entry = $(this).parent().data('entry')
    console.log(entry)
    $('#entry_input').val(entry)
    $('#cart_form').submit()
  })
}

$(document).ready(function(){
    $("#nav-mobile").html($("#nav-main").html());
    $("#nav-trigger span").click(function(){
        if ($("nav#nav-mobile ul").hasClass("expanded")) {
            $("nav#nav-mobile ul.expanded").removeClass("expanded").slideUp(250);
            $(this).removeClass("open");
        } else {
            $("nav#nav-mobile ul").addClass("expanded").slideDown(250);
            $(this).addClass("open");
        }
    });
});