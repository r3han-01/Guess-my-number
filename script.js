'use strict';

let secretNumber = Math.trunc(Math.random() * 20) + 1;
let score = 10;
let highscore = 0;

const displayMessage = function(message) {
  document.querySelector('.message').textContent = message;
}

document.querySelector('.check').addEventListener
('click', function () {
  const guess = Number(document.querySelector('.guess').value);
  console.log(guess, typeof guess);

  if (!guess) {
    displayMessage('❌ No Number');

    //When Player Wins.
  } else if (guess === secretNumber) {
    displayMessage('🎉 Correct Number');

    document.querySelector('.number').textContent = secretNumber;

    document.querySelector('body').style.backgroundColor = '#60b347';

    document.querySelector('.number').style.width = '30rem';

    if (score > highscore) {
      highscore = score;
      document.querySelector('.highscore').textContent = highscore;
    }
  
  }

  //When guess is too High.
  else if (guess > secretNumber) {
    displayMessage('📈 Too High!');
    score--;
    document.querySelector('.score').textContent = score;

    //When Guess is too Low.
  } else if (guess < secretNumber) {
    displayMessage('📉 Too Low!');
    score--;
    document.querySelector('.score').textContent = score;
  }

  if (score < 0) {
    displayMessage('☠️ You Lost the Game');
    document.querySelector('.score').textContent = '0'
  }
});


//Refresh Button
document.querySelector('.again').addEventListener('click', function() {
  score = 10;
  secretNumber = Math.trunc(Math.random() * 20) + 1;

  displayMessage('Start guessing...');
  document.querySelector('.score').textContent = score;
  document.querySelector('.number').textContent = '?';
  document.querySelector('.guess').value = '';
  
  document.querySelector('body').style.backgroundColor = '#222'
  document.querySelector('.number').style.width = '15rem'
  


});