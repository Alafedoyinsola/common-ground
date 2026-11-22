import { requestExpandedMode } from '@devvit/web/client';

const startButton = document.getElementById('start-button');

if (startButton) {
  startButton.addEventListener('click', (event) => {
    requestExpandedMode(event, 'game');
  });
}
