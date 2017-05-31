GameHouse Shopping List Assignment:

The seneca-cart plugin provides an easy interface for performing cart-
related actions, seen throughout this example. By making posts to urls 
like "/api/cart/add_entry" and "/api/cart/remove_entry", you can easily 
manipulate the cart back-end without tightly coupled logic. All of the 
configuration for the cart plugin lies in app.js.

The documentation of the project can be found at http://35.157.199.107/doc_introduction

PREREQUISITES:

Install MongoDB by following these instructions:
    sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
    echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.2.list
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    sudo service mongod start

Install npm:
    sudo apt install npm

DEPLOYMENT:
Download the code from git repository, install dependencies, run the tests and start the application:

    git clone https://github.com/migueljmonasor/assignment.git
    cd assignment
    npm install
    npm test test/cart.test.js
    nodejs app.js -p PORT_NUMBER

    and then visit: http://localhost:PORT_NUMBER

Database population:
    After deployment the following link allows populating the database with initial products. It also removes existing shopping lists: http://localhost:80/dataAdmin