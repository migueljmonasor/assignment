/*Author: Miguel Monasor*/
function populateData(){
    var response = confirm("This action will populate the database with default data");
    if (response == true) {
        var populate_form  = $('#populate_form');
        populate_form.submit();
    }
}