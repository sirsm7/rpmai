class UserForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = this.shadowRoot.querySelector('#record-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const statusElement = this.shadowRoot.querySelector('#status-message');
        const submitButton = this.shadowRoot.querySelector('button[type="submit"]');

        const formData = {
            nama: this.shadowRoot.querySelector('#nama').value.trim(),
            kod_sekolah: this.shadowRoot.querySelector('#kod_sekolah').value.trim(),
            nama_sekolah: this.shadowRoot.querySelector('#nama_sekolah').value.trim(),
            jawatan: this.shadowRoot.querySelector('#jawatan').value.trim(),
            telefon: this.shadowRoot.querySelector('#telefon').value.trim()
        };

        if (!formData.nama || !formData.kod_sekolah) {
            this.showStatus('Please fill in all required fields.', 'error');
            return;
        }

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
            this.showStatus('Submitting data to database...', 'info');

            const { data, error } = await window.appDb
                .from('records')
                .insert([formData]);

            if (error) {
                throw error;
            }

            this.showStatus('Record successfully added!', 'success');
            event.target.reset();

            if (window.appEvents && typeof window.appEvents.trigger === 'function') {
                window.appEvents.trigger('app:dataChanged', { action: 'insert', data: formData });
            }
        } catch (err) {
            console.error('Error inserting data:', err);
            this.showStatus(`Failed to save record: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Record';
        }
    }

    showStatus(message, type) {
        const statusElement = this.shadowRoot.querySelector('#status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-box ${type}`;
            statusElement.style.display = 'block';
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: var(--surface-color, #ffffff);
                    border-radius: var(--border-radius, 8px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    padding: var(--spacing-lg, 24px);
                }

                h2 {
                    margin-top: 0;
                    margin-bottom: var(--spacing-md, 16px);
                    color: var(--primary-color, #2c3e50);
                    font-size: 1.25rem;
                    border-bottom: 2px solid var(--border-color, #dcdde1);
                    padding-bottom: 8px;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 16px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .form-group.full-width {
                    grid-column: 1 / -1;
                }

                label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-primary, #2c3e50);
                }

                label .required {
                    color: var(--error-color, #e74c3c);
                }

                input, select {
                    padding: 10px 12px;
                    border: 1px solid var(--border-color, #dcdde1);
                    border-radius: 6px;
                    font-size: 0.95rem;
                    font-family: inherit;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                input:focus, select:focus {
                    outline: none;
                    border-color: var(--accent-color, #3498db);
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
                }

                .button-group {
                    margin-top: 20px;
                    display: flex;
                    justify-content: flex-end;
                }

                button[type="submit"] {
                    background-color: var(--accent-color, #3498db);
                    color: #ffffff;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                button[type="submit"]:hover {
                    background-color: #2980b9;
                }

                button[type="submit"]:disabled {
                    background-color: #bdc3c7;
                    cursor: not-allowed;
                }

                .status-box {
                    margin-top: 16px;
                    padding: 12px;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    display: none;
                }

                .status-box.info {
                    background-color: #ebf5fb;
                    color: #2980b9;
                    border: 1px solid #aed6f1;
                }

                .status-box.success {
                    background-color: #e8f8f5;
                    color: #27ae60;
                    border: 1px solid #a3e4d7;
                }

                .status-box.error {
                    background-color: #fadbd8;
                    color: #c0392b;
                    border: 1px solid #f5b7b1;
                }
            </style>

            <h2>Registration Form</h2>
            <form id="record-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="nama">Full Name <span class="required">*</span></label>
                        <input type="text" id="nama" name="nama" placeholder="e.g. Ahmad bin Ali" required>
                    </div>

                    <div class="form-group">
                        <label for="kod_sekolah">School Code <span class="required">*</span></label>
                        <input type="text" id="kod_sekolah" name="kod_sekolah" placeholder="e.g. ABA1234" required>
                    </div>

                    <div class="form-group">
                        <label for="nama_sekolah">School Name</label>
                        <input type="text" id="nama_sekolah" name="nama_sekolah" placeholder="e.g. SK Seri Melati">
                    </div>

                    <div class="form-group">
                        <label for="jawatan">Designation</label>
                        <input type="text" id="jawatan" name="jawatan" placeholder="e.g. Guru Besar / Pengetua">
                    </div>

                    <div class="form-group">
                        <label for="telefon">Phone Number</label>
                        <input type="tel" id="telefon" name="telefon" placeholder="e.g. 0123456789">
                    </div>
                </div>

                <div id="status-message" class="status-box"></div>

                <div class="button-group">
                    <button type="submit">Save Record</button>
                </div>
            </form>
        `;
    }
}

customElements.define('user-form', UserForm);