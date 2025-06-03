// This file contains the JavaScript code for the website. 
// It handles interactivity and dynamic content on the webpage.

document.addEventListener('DOMContentLoaded', function() {
    const welcomeMessage = document.getElementById('welcome-message');
    welcomeMessage.textContent = 'Welcome to WeMarket4U!';

    const items = [
        { name: 'Product 1', price: 10 },
        { name: 'Product 2', price: 15 },
        { name: 'Product 3', price: 20 }
    ];

    const itemList = document.getElementById('item-list');
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `${item.name} - $${item.price}`;
        itemList.appendChild(listItem);
    });

    const cartButton = document.getElementById('cart-button');
    cartButton.addEventListener('click', function() {
        alert('Cart functionality is not implemented yet.');
    });
});