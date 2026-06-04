import './field.webcomponent.css';
import { useState, useEffect } from 'wc-hooks';

function Field({ label = 'Field' }) {
  const [value] = useState(label);

  useEffect(() => {
    console.log('Field montado');
  }, []);

  return `
    <span class="field-label">${value}</span>
  `;
}
