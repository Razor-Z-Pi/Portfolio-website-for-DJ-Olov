const DJ_PHOTO_PATH = "./image/dj.jpg";

//    Поддерживаются форматы: mp3, wav, ogg, m4a
//    Если треков нет, отобразится заглушка с инструкцией.
const TRACKS_FOLDER = "./tracks/"; 

const MANUAL_TRACKS = [
    "DmitryBassAIEdit.mp3",
    ""   
];

// Можно также указать расширения в порядке приоритета:
const SUPPORTED_EXT = [".mp3", ".wav", ".ogg", ".m4a"];

// Классные описания для треков (чтобы оживить портфолио)
const TRACK_DESCRIPTIONS = {
    "DmitryBassAIEdit.mp3": "Глубокий хаус",
};

async function autoDetectTracks() {
    console.log('🔍 Автоматический поиск треков в папке tracks/...');
    
    const commonNames = TRACKS_LIST.length > 0 ? TRACKS_LIST : [];
    const foundTracks = [];
    
    // Если пользователь указал треки вручную
    if (commonNames.length > 0) {
        for (let trackName of commonNames) {
            // Проверяем, указан ли полный путь или только имя
            let trackPath = trackName;
            
            // Если в названии нет слеша, добавляем папку tracks/
            if (!trackName.includes('/')) {
                trackPath = TRACKS_FOLDER + trackName;
            }
            
            const exists = await checkFileExists(trackPath);
            if (exists) {
                console.log(`Найден трек: ${trackPath}`);
                foundTracks.push({
                    name: trackName,
                    displayName: formatTrackName(trackName),
                    url: trackPath,
                    description: getTrackDescription(trackName),
                    duration: null
                });
            } else {
                console.warn(`Трек не найден: ${trackPath}`);
                
                // Пробуем другие расширения
                const nameWithoutExt = trackName.replace(/\.[^/.]+$/, "");
                for (let ext of SUPPORTED_EXT) {
                    const testPath = (trackName.includes('/') ? 
                        trackName.replace(/\.[^/.]+$/, "") + ext : 
                        TRACKS_FOLDER + nameWithoutExt + ext);
                    
                    if (testPath !== trackPath) {
                        const existsAlt = await checkFileExists(testPath);
                        if (existsAlt) {
                            console.log(`Найден альтернативный трек: ${testPath}`);
                            foundTracks.push({
                                name: trackName,
                                displayName: formatTrackName(nameWithoutExt),
                                url: testPath,
                                description: getTrackDescription(nameWithoutExt),
                                duration: null
                            });
                            break;
                        }
                    }
                }
            }
        }
    }
    
    return foundTracks;
}

const fileCache = new Map();

async function checkFileExists(url) {
    if (fileCache.has(url)) {
        return fileCache.get(url);
    }
    
    try {
        const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        const exists = response.ok;
        fileCache.set(url, exists);
        return exists;
    } catch (error) {
        fileCache.set(url, false);
        return false;
    }
}

function formatTrackName(filename) {
    let name = filename.replace(/\.[^/.]+$/, "")
                      .replace(/[_\-]/g, " ")
                      .replace(/([A-Z])/g, ' $1')
                      .trim();
    
    // Делаем первую букву заглавной, остальные строчные
    return name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ').replace(/\s+/g, ' ');
}

// Получить описание трека, если есть кастомное
function getTrackDescription(trackId) {
    const base = trackId.replace(/\.[^/.]+$/, "").toLowerCase();
    return TRACK_DESCRIPTIONS[base] || "Оригинальный трек / эксклюзивный микс";
}

// динамическая загрузка треков из указанной папки (через проверку существования файлов)
async function loadTracks() {
    const container = document.getElementById('tracksContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="no-tracks"><i class="fas fa-spinner fa-pulse"></i> Поиск треков в папке tracks...</div>';
    
    let trackItems = [];
    
    // Пытаемся найти треки
    trackItems = await autoDetectTracks();
    
    console.log(`Успешно загружено треков: ${trackItems.length}`);
    renderTrackCards(trackItems, container);
}

function renderTrackCards(tracks, container) {
    container.innerHTML = "";
    
    tracks.forEach((track, index) => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.style.animation = `fadeIn 0.5s ease ${index * 0.1}s both`;
        
        card.innerHTML = `
            <div class="track-icon"><i class="fas fa-waveform"></i></div>
            <div class="track-title">${escapeHtml(track.displayName)}</div>
            <div class="track-meta">
                <i class="fas fa-tag"></i> ${escapeHtml(track.description)}
            </div>
            <div class="audio-player">
                <audio controls preload="metadata" style="width:100%">
                    <source src="${track.url}" type="audio/mpeg">
                    <source src="${track.url}" type="audio/wav">
                    <source src="${track.url}" type="audio/ogg">
                    Ваш браузер не поддерживает аудиоплеер.
                </audio>
            </div>
            <div class="track-duration">
                <i class="far fa-clock"></i> 
                <span class="duration-text">Загрузка...</span>
            </div>
        `;
        container.appendChild(card);
        
        // Добавляем отображение длительности
        const audioElem = card.querySelector('audio');
        const durationSpan = card.querySelector('.duration-text');
        
        if (audioElem && durationSpan) {
            audioElem.addEventListener('loadedmetadata', () => {
                const minutes = Math.floor(audioElem.duration / 60);
                const seconds = Math.floor(audioElem.duration % 60);
                durationSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            });
            
            audioElem.addEventListener('error', (e) => {
                durationSpan.textContent = 'ошибка';
                console.error(`Ошибка загрузки: ${track.url}`);
            });
            
            // Таймаут на случай, если файл долго грузится
            setTimeout(() => {
                if (durationSpan.textContent === 'Загрузка...') {
                    durationSpan.textContent = 'Готов к проигрыванию';
                }
            }, 2000);
        }
    });
}

// Вспомогательная функция проверки существования файла
function checkFileExists(url) {
    return fetch(url, { method: 'HEAD', cache: 'no-cache' })
        .then(response => response.ok)
        .catch(() => false);
}

// для безопасности от XSS
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function (c) {
        return c;
    });
}

function setupDJPhoto() {
    const imgElement = document.getElementById('djPhoto');
    if (imgElement && DJ_PHOTO_PATH && DJ_PHOTO_PATH !== "./image/dj.jpg") {
        imgElement.src = DJ_PHOTO_PATH;
        imgElement.alt = "DJ Olow - профессиональное фото";
    } else if (imgElement && DJ_PHOTO_PATH && DJ_PHOTO_PATH.includes("placehold")) {
        imgElement.alt = "Загрузите своё фото!!!";
    }
}

// плавный скролл и уведомление для кнопки бронирования
function initInteractions() {
    const bookingBtn = document.getElementById('bookingBtn');
    if (bookingBtn) {
        bookingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert("Свяжитесь с менеджментом: olow.com или номер\n");
        });
    }
    const contactLink = document.getElementById('contactLink');
    if (contactLink) {
        contactLink.addEventListener('click', (e) => {
            e.preventDefault();
            const footer = document.querySelector('footer');
            footer.scrollIntoView({ behavior: 'smooth' });
        });
    }
    // плавные якоря для навигации
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (anchor.getAttribute('href') !== "#" && anchor.getAttribute('href').length > 1) {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === "#") return;
                const targetElem = document.querySelector(targetId);
                if (targetElem) {
                    e.preventDefault();
                    targetElem.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    });
}

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Главная функция инициализации
async function init() {
    setupDJPhoto();
    await loadTracks();
    initInteractions();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}