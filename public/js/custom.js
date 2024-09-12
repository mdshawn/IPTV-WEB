const cardWrapper = document.querySelector('.card-wrapper');
const slideLeftBtn = document.querySelector('.slide-left');
const slideRightBtn = document.querySelector('.slide-right');

let currentCard = 0;

slideRightBtn.addEventListener('click', () => {
    currentCard++;
    cardWrapper.style.transform = `translateX(-${currentCard * 100}%)`;
    slideLeftBtn.classList.remove('hidden');
    if (currentCard === 1) { // Update this based on the number of cards
        slideRightBtn.classList.add('hidden');
    }
});

slideLeftBtn.addEventListener('click', () => {
    currentCard--;
    cardWrapper.style.transform = `translateX(-${currentCard * 100}%)`;
    slideRightBtn.classList.remove('hidden');
    if (currentCard === 0) {
        slideLeftBtn.classList.add('hidden');
    }
});
