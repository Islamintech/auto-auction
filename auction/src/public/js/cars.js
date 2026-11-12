// Image preview — cover
function previewImage(input, index) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(`preview-${index}`);
            preview.src = e.target.result;
            preview.style.display = 'block';
            const icon = document.getElementById('cover-icon');
            if (icon) icon.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Secondary image inputs
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.secondary-file-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = this.dataset.index;
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById(`preview-${index}`);
                    const icon    = document.getElementById(`icon-${index}`);
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    if (icon) icon.style.display = 'none';
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    });

    // Discard button closes details
    const discardBtn = document.getElementById('discard-btn');
    if (discardBtn) {
        discardBtn.addEventListener('click', () => {
            document.querySelector('details').removeAttribute('open');
        });
    }

    initUsdEstimates();
});

let usdKrwRate = null;

function initUsdEstimates() {
    const inputs = document.querySelectorAll('[data-usd-estimate-source]');
    if (!inputs.length) return;

    inputs.forEach((input) => {
        input.addEventListener('input', () => updateUsdEstimate(input));
        updateUsdEstimate(input);
    });

    fetch('/admin/currency/usd-krw')
        .then((res) => {
            if (!res.ok) throw new Error('Rate request failed');
            return res.json();
        })
        .then((data) => {
            usdKrwRate = Number(data.rate);
            inputs.forEach((input) => updateUsdEstimate(input));
        })
        .catch(() => {
            document.querySelectorAll('[data-usd-estimate]').forEach((target) => {
                target.textContent = 'Estimated USD: exchange rate unavailable';
            });
        });
}

function updateUsdEstimate(input) {
    const estimate = input.parentElement?.querySelector('[data-usd-estimate]');
    if (!estimate) return;

    if (!usdKrwRate) {
        estimate.textContent = 'Estimated USD: loading exchange rate...';
        return;
    }

    const amounts = parseKrwAmounts(input.value);
    if (!amounts.length) {
        estimate.textContent = 'Estimated USD: enter a KRW price';
        return;
    }

    const converted = amounts.map((amount) => amount / usdKrwRate);
    estimate.textContent = `Estimated USD: ${formatUsdEstimate(converted)}`;
}

function parseKrwAmounts(value) {
    return (value.match(/\d[\d,]*/g) || [])
        .map((part) => Number(part.replace(/,/g, '')))
        .filter((amount) => Number.isFinite(amount) && amount > 0)
        .slice(0, 2);
}

function formatUsdEstimate(amounts) {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    });

    if (amounts.length === 1) return formatter.format(amounts[0]);
    return `${formatter.format(amounts[0])} ~ ${formatter.format(amounts[1])}`;
}

// Search filter
function filterCars() {
    const query = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.car-row').forEach(row => {
        const title = row.dataset.title || '';
        const brand = row.dataset.brand || '';
        row.style.display = (title.includes(query) || brand.includes(query)) ? '' : 'none';
    });
}

// Update status
function updateCarStatus(select) {
    const carId     = select.id;
    const carStatus = select.value;

    // Selling requires buyer details — collect them through the sale modal.
    if (carStatus === 'SOLD') {
        openSaleModal(select);
        return;
    }

    fetch(`/admin/car/${carId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carStatus }),
    })
    .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, 'Failed to update'));
        return res.json();
    })
    .then(() => window.location.reload())
    .catch((err) => alert(err.message || 'Failed to update'));
}

// Reads the JSON snapshot the table row carries. Both the inventory table and
// the sold-cars table expose it, so any control inside a row can find its car.
function getRowCar(el) {
    const row = el.closest('[data-car]');
    if (!row || !row.dataset.car) return null;
    return JSON.parse(decodeURIComponent(row.dataset.car));
}

// Pulls the server's `{ message }` out of a failed response so the admin sees
// the real reason instead of a generic alert.
async function readError(res, fallback) {
    try {
        const body = await res.json();
        if (body && body.message) return body.message;
    } catch (e) { /* empty or non-JSON body */ }
    return fallback;
}

// Record-sale modal
let saleSourceSelect = null;

// Entry point for an already-sold car: the status dropdown fires no change event
// when "Sold" is re-picked, so the sale record needs its own button.
function openSaleModalFromRow(button) {
    openSaleModal(button);
}

function openSaleModal(select) {
    // Only a <select> needs reverting on cancel; a button does not.
    saleSourceSelect = select.tagName === 'SELECT' ? select : null;
    const car = getRowCar(select) || {};
    const modal = document.getElementById('sale-modal');
    const form = document.getElementById('sale-form');
    if (!modal || !form) return;

    form.reset();
    form.elements._id.value = car._id || select.id || '';
    const titleEl = document.getElementById('sale-car-title');
    if (titleEl) titleEl.textContent = car.carTitle || '';
    form.elements.carVin.value = car.carVin || '';
    form.elements.buyerName.value = car.buyerName || '';
    if (car.salePrice != null) form.elements.salePrice.value = car.salePrice;
    // Pre-fill the saved sale date, otherwise default to today.
    form.elements.saleDate.value = car.saleDate
        ? new Date(car.saleDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    modal.classList.remove('hidden');
}

function closeSaleModal() {
    const modal = document.getElementById('sale-modal');
    if (modal) modal.classList.add('hidden');
    // Revert the dropdown to the car's saved status since the sale was not confirmed.
    if (saleSourceSelect) {
        const car = getRowCar(saleSourceSelect);
        if (car && car.carStatus) saleSourceSelect.value = car.carStatus;
    }
    saleSourceSelect = null;
}

document.addEventListener('DOMContentLoaded', () => {
    const saleForm = document.getElementById('sale-form');
    if (!saleForm) return;

    saleForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const carId = saleForm.elements._id.value;
        const carVin = saleForm.elements.carVin.value.trim().toUpperCase();
        const buyerName = saleForm.elements.buyerName.value.trim();
        const salePrice = Number(saleForm.elements.salePrice.value);
        const saleDate = saleForm.elements.saleDate.value;

        if (!carVin || !buyerName || !(salePrice >= 0) || !saleDate) {
            alert('Enter the VIN, buyer name, sale price and sale date.');
            return;
        }

        fetch(`/admin/car/${carId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carStatus: 'SOLD', carVin, buyerName, salePrice, saleDate }),
        })
        .then(async (res) => {
            if (!res.ok) throw new Error(await readError(res, 'Failed to record sale'));
            return res.json();
        })
        .then(() => {
            saleSourceSelect = null;
            alert('Sale recorded');
            window.location.reload();
        })
        .catch((err) => alert(err.message || 'Failed to record sale'));
    });
});

// Sale details only apply to a sold car — show/hide them with the status select.
function toggleEditSaleFields(form) {
    const wrap = document.getElementById('edit-sale-fields');
    if (!wrap || !form.elements.carStatus) return;
    wrap.classList.toggle('hidden', form.elements.carStatus.value !== 'SOLD');
}

function openEditCarModal(button) {
    const car = getRowCar(button);
    const modal = document.getElementById('edit-car-modal');
    const form = document.getElementById('edit-car-form');
    const imageGrid = document.getElementById('edit-car-images');
    if (!car || !modal || !form) return;

    form.reset();
    form.elements._id.value = car._id;

    [
        'carTitle',
        'carVin',
        'carBrand',
        'carType',
        'carCondition',
        'carStatus',
        'carYear',
        'carMileage',
        'carPrice',
        'carColor',
        'carMake',
        'carModel',
        'carFuel',
        'carTransmission',
        'carDesc',
        'buyerName',
    ].forEach((name) => {
        if (form.elements[name]) form.elements[name].value = car[name] ?? '';
    });

    // salePrice is a number and saleDate an ISO timestamp — neither survives the
    // plain assignment above (a `date` input only accepts YYYY-MM-DD).
    if (form.elements.salePrice)
        form.elements.salePrice.value = car.salePrice != null ? car.salePrice : '';
    if (form.elements.saleDate)
        form.elements.saleDate.value = car.saleDate
            ? new Date(car.saleDate).toISOString().slice(0, 10)
            : '';
    toggleEditSaleFields(form);

    if (form.elements.carPrice) updateUsdEstimate(form.elements.carPrice);

    imageGrid.innerHTML = '';
    (car.carImages || []).forEach((image) => {
        const img = document.createElement('img');
        img.src = /^https?:\/\//.test(image) ? image : `/${image}`;
        img.alt = car.carTitle || 'car';
        img.className = 'w-full h-24 object-cover rounded border border-outline bg-black';
        imageGrid.appendChild(img);
    });
    if (!imageGrid.children.length) {
        imageGrid.innerHTML = '<div class="col-span-2 h-24 rounded border border-outline bg-black/40 flex items-center justify-center text-on-surface-faint text-xs font-mono uppercase">No images</div>';
    }

    modal.classList.remove('hidden');
}

function closeEditCarModal() {
    const modal = document.getElementById('edit-car-modal');
    if (modal) modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-car-form');
    if (!editForm) return;

    // Keep the sale block in sync while the admin changes status in the modal.
    if (editForm.elements.carStatus) {
        editForm.elements.carStatus.addEventListener('change', () =>
            toggleEditSaleFields(editForm)
        );
    }

    editForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const carId = editForm.elements._id.value;
        const payload = {};
        const optionalFields = ['carVin', 'carColor', 'carMake', 'carModel', 'carDesc'];

        [
            'carStatus',
            'carTitle',
            'carBrand',
            'carType',
            'carCondition',
            'carFuel',
            'carTransmission',
            'carYear',
            'carMileage',
            'carPrice',
            ...optionalFields,
        ].forEach((name) => {
            const value = editForm.elements[name]?.value;
            if (optionalFields.includes(name) && value === '') return;
            payload[name] = name === 'carMileage' ? Number(value) : value;
        });

        // Sale details ride along only while the car stays Sold; switching to any
        // other status makes the server clear them, so sending them would conflict.
        if (payload.carStatus === 'SOLD') {
            const buyerName = editForm.elements.buyerName?.value.trim() ?? '';
            const salePrice = editForm.elements.salePrice?.value ?? '';
            const saleDate = editForm.elements.saleDate?.value ?? '';

            if (!buyerName || salePrice === '' || !saleDate) {
                alert('A sold car needs a buyer name, sale price and sale date.');
                return;
            }
            payload.buyerName = buyerName;
            payload.salePrice = Number(salePrice);
            payload.saleDate = saleDate;
        }

        fetch(`/admin/car/${carId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then(async (res) => {
            if (!res.ok) throw new Error(await readError(res, 'Failed to update car information'));
            return res.json();
        })
        .then(() => {
            alert('Car information updated');
            window.location.reload();
        })
        .catch((err) => alert(err.message || 'Failed to update car information'));
    });
});

// Delete car
function deleteCar(id) {
    if (!confirm('Delete this car permanently?')) return;
    fetch(`/admin/car/${id}/delete`, { method: 'POST' })
        .then(async (res) => {
            if (!res.ok) throw new Error(await readError(res, 'Failed to delete'));
            return res.json();
        })
        .then(() => window.location.reload())
        .catch((err) => alert(err.message || 'Failed to delete'));
}

// Validate form
function validateCarForm() {
    const title = document.querySelector('[name="carTitle"]').value;
    const brand = document.querySelector('[name="carBrand"]').value;
    const type  = document.querySelector('[name="carType"]').value;
    const cond  = document.querySelector('[name="carCondition"]').value;
    const year  = document.querySelector('[name="carYear"]').value;
    const price = document.querySelector('[name="carPrice"]').value;
    if (!title || !brand || !type || !cond || !year || !price) {
        alert('Please fill in all required fields');
        return false;
    }
    return true;
}
