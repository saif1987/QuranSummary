const SURAH_INDEX = 2; // The index of the surah we want to display

// DOM Element Selectors (cached)
const languageToggle = document.querySelector('.language-toggle');
const contentWrappers = document.querySelectorAll('.content-wrapper');
const langButtons = document.querySelectorAll('.lang-btn');

const modal = document.getElementById('popup-modal');
const modalContainer = document.getElementById('modal-container');
const modalContentHost = document.getElementById('modal-content-host');
const modalCloseButton = document.getElementById('modal-close-btn');
const saveJpgButton = document.getElementById('save-jpg-btn');

const chartTitleEn = document.getElementById('chart-title-en');
const chartTitleBn = document.getElementById('chart-title-bn');
const chartContainerEn = document.getElementById('chart-container-en');
const chartContainerBn = document.getElementById('chart-container-bn');
const summaryGridEn = document.getElementById('summary-grid-en');
const summaryGridBn = document.getElementById('summary-grid-bn');


function setLanguage(lang) {
    contentWrappers.forEach(wrapper => wrapper.classList.remove('active'));
    langButtons.forEach(btn => btn.classList.remove('active'));

    document.getElementById('content-' + lang).classList.add('active');
    document.getElementById('btn-' + lang).classList.add('active');

    document.body.style.fontFamily = lang === 'bn' ? 'var(--font-bn)' : 'var(--font-en)';
}

let contentToSave = null;

function showPopup(event) {
    const sourceElement = event.currentTarget;
    if (!sourceElement) return;

    const rect = sourceElement.getBoundingClientRect();

    // Set position and width based on the clicked element
    modalContainer.style.width = `${rect.width}px`;
    modalContainer.style.top = `${rect.top}px`;
    modalContainer.style.left = `${rect.left}px`;
    modalContainer.style.borderRadius = window.getComputedStyle(sourceElement).borderRadius;
    
    const contentClone = sourceElement.cloneNode(true);
    contentClone.classList.remove('clickable');
    // Robustly remove onclick if it exists, though it shouldn't with current HTML
    if (contentClone.hasAttribute('onclick')) {
        contentClone.removeAttribute('onclick');
    }

    // Ensure the clone fills the modal content host correctly
    contentClone.style.width = '100%';
    contentClone.style.height = 'auto'; // Let content dictate its height, modal-content-host will scroll
    contentClone.style.maxWidth = '100%'; // Override any max-width from original classes like .chart-container
    contentClone.style.margin = '0';      // Reset any margins on the clone itself
    contentClone.style.boxSizing = 'border-box'; // Ensure padding/border are included within the 100% width

    contentToSave = contentClone;

    modalContentHost.innerHTML = '';
    modalContentHost.appendChild(contentClone);

    // CRITICAL: Make the modal overlay visible *before* attempting to measure
    // the offsetHeight of its children. Otherwise, offsetHeight will be 0.
    modal.style.display = 'block';

    // Calculate the height needed
    const modalActionsElement = modalContainer.querySelector('.modal-actions');
    const actionsHeight = modalActionsElement ? modalActionsElement.offsetHeight : 0;
    const clonedContentHeight = contentClone.offsetHeight; // Height of the actual cloned content

    // Optional: Log the calculated heights for debugging
    // console.log(`actionsHeight: ${actionsHeight}, clonedContentHeight: ${clonedContentHeight}`);

    modalContainer.style.height = `${clonedContentHeight + actionsHeight}px`;

}

function closePopup(event) {
    if (!event || event.target === modal || event.target.classList.contains('modal-close-btn')) {
        modal.style.display = 'none';
        modalContentHost.innerHTML = '';
        contentToSave = null;
    }
}

function saveAsJpg() {
    if (!contentToSave) return;

    const titleElement = contentToSave.querySelector('h1, h2');
    const fileName = (titleElement ? titleElement.textContent.trim() : 'analysis-section').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg';

    html2canvas(contentToSave, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    }).catch(err => console.error("Error saving image:", err));
}

// --- Data Loading and Rendering ---

/**
 * A simple CSV parser.
 * @param {string} csvText The raw CSV text.
 * @returns {Array<Object>} An array of objects.
 */
function parseCSV(csvText) {
    const trimmedCsvText = csvText.trim();
    if (!trimmedCsvText) return []; // Handle empty input
    const lines = trimmedCsvText.split(/\r?\n/); // Handles \n and \r\n
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^",\r\n]+)(?=\s*,|\s*$)/g) || [];
        if (values.length === headers.length) {
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                let value = values[j].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1).replace(/""/g, '"'); // Handle double quotes inside
                }
                row[headers[j]] = value;
            }
            rows.push(row);
        }
        // Optional: Add an else case here to log or handle rows with mismatched column counts
        // else if (lines[i].trim() !== '') { console.warn(`Skipping malformed CSV line: ${lines[i]}`); }
    }
    return rows;
}

async function loadDataAndRender() {
    try {
        const [sectionsResponse, namesResponse] = await Promise.all([
            fetch('data/2.csv'), // Updated path
            fetch('data/surah_name.csv') // Updated path
        ]);

        const sectionsText = await sectionsResponse.text();
        const namesText = await namesResponse.text();

            console.log("Attempting to parse sections CSV data...");
        const sectionsData = parseCSV(sectionsText);
            if (sectionsData.length > 0) {
                console.log("Successfully parsed sectionsData:", sectionsData);
            } else {
                console.warn("Parsed sectionsData is empty. Check 2.csv format or content.");
            }

            console.log("Attempting to parse surah names CSV data...");
        const namesData = parseCSV(namesText);
            if (namesData.length > 0) {
                console.log("Successfully parsed namesData:", namesData);
            } else {
                console.warn("Parsed namesData is empty. Check surah_name.csv format or content.");
            }

        const surahInfo = namesData.find(s => parseInt(s.surah_index) === SURAH_INDEX);

        if (!surahInfo) {
            console.error(`Surah with index ${SURAH_INDEX} not found.`);
            return;
        }

        renderPage(surahInfo, sectionsData);

    } catch (error) {
        console.error("Failed to load or render data:", error);
        if(chartTitleEn) chartTitleEn.textContent = 'Error loading data.';
        if(chartTitleBn) chartTitleBn.textContent = 'তথ্য লোড করতে ত্রুটি।';
    }
}

function renderPage(surahInfo, sections) {
    // Render titles
    document.getElementById('chart-title-en').textContent = `Analysis of ${surahInfo.name_eng} Sections`;
    document.getElementById('chart-title-bn').textContent = `${surahInfo.name_bn} অংশের বিশ্লেষণ`;
    // Containers are already cached globally (chartContainerEn, chartContainerBn, summaryGridEn, summaryGridBn)
    
    // Clear existing generated content (but keep titles)
    const clearContainer = (container) => {
        while (container.children.length > 1) { // Keep the h1 title
            container.removeChild(container.lastChild);
        }
    };
    clearContainer(chartContainerEn);
    clearContainer(chartContainerBn);
    summaryGridEn.innerHTML = '';
    summaryGridBn.innerHTML = '';

    // Prepare for chart rendering
    const verseCounts = sections.map(s => parseInt(s.ending_verse) - parseInt(s.starting_verse) + 1);
    const maxVerseCount = Math.max(...verseCounts, 1); // Avoid division by zero

    // Helper function to create a chart row
    function createChartRowElement(section, barWidthPercent) {
        const chartRow = document.createElement('div');
        chartRow.className = 'chart-row';
        chartRow.innerHTML = `
            <div class="section-name">${section.name_lang}</div>
            <div class="bar-area">
                <div class="bar" style="width: ${barWidthPercent}%;"></div>
                <div class="chart-verse-span">[${section.starting_verse}-${section.ending_verse}]</div>
            </div>
        `;
        return chartRow;
    }

    // Helper function to create a summary card
    function createSummaryCardElement(section, lang) {
        const card = document.createElement('div');
        card.id = `summary-${lang}-${section.section_index}`;
        card.className = 'summary-card clickable';
        // card.setAttribute('onclick', 'showPopup(event)'); // Replaced by event listener
        card.innerHTML = `
            <h2>${section.section_index}. ${section.name_lang}</h2>
            <p class="verse-info">${lang === 'en' ? 'Verses' : 'আয়াত'}: [${section.starting_verse}-${section.ending_verse}]</p>
            <p>${section.summary_lang}</p>
        `;
        return card;
    }

    sections.forEach((section, index) => {
        const verseCount = verseCounts[index];
        const barWidth = (verseCount / maxVerseCount) * 95; // 95% to leave some space

        // --- Render Chart Rows ---
        chartContainerEn.appendChild(createChartRowElement({ ...section, name_lang: section.name_eng }, barWidth));
        chartContainerBn.appendChild(createChartRowElement({ ...section, name_lang: section.name_bn }, barWidth));

        // --- Render Summary Cards ---
        summaryGridEn.appendChild(createSummaryCardElement({ ...section, name_lang: section.name_eng, summary_lang: section.summary_eng }, 'en'));
        summaryGridBn.appendChild(createSummaryCardElement({ ...section, name_lang: section.name_bn, summary_lang: section.summary_bn }, 'bn'));
    });

    // Add click listeners to newly created clickable elements
    document.querySelectorAll('.clickable').forEach(element => {
        element.addEventListener('click', showPopup);
    });
}

// --- Event Listeners ---
function initializeEventListeners() {
    langButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            setLanguage(event.target.dataset.lang);
        });
    });

    if(modalCloseButton) modalCloseButton.addEventListener('click', closePopup);
    if(saveJpgButton) saveJpgButton.addEventListener('click', saveAsJpg);
    if(modal) modal.addEventListener('click', closePopup); // For clicking on overlay to close

    window.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            closePopup(null); // Pass null or an event-like object if needed by closePopup
        }
    });

    // Initial setup for clickable containers (if they are static and not cleared/re-added)
    // If they are cleared and re-added, listeners should be added after re-creation as done in renderPage.
    // For now, assuming the main containers might be static and their children are dynamic.
    // If chartContainerEn/Bn themselves are the primary click targets for the popup:
    if(chartContainerEn) chartContainerEn.addEventListener('click', showPopup);
    if(chartContainerBn) chartContainerBn.addEventListener('click', showPopup);
}

document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    loadDataAndRender();
    setLanguage('en'); // Set default language
});