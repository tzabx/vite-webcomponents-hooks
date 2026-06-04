import './counter.webcomponent.css';
import { useState, useEffect, useRef, useEvent } from 'wc-hooks';

function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);
  const buttonRef = useRef();

  useEffect(() => {
    console.log('Counter montado');
    return () => console.log('Counter desmontado');
  }, []);

  useEffect(() => {
    console.log('Count cambió a', count);
  }, [count]);

  useEvent(buttonRef, 'click', () => {
    setCount(count + 1);
    buttonRef.current
      .closest('counter')
      .dispatchEvent(new CustomEvent('change', { detail: count + 1 }));
  });

  return `
    <div class="counter">
      <span>Count: ${count}</span>
      <button ref="buttonRef" id="inc">Increment</button>
    </div>
  `;
}
