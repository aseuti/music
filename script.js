
class WeatherMusicApp {
    constructor() {
        // API 설정
        this.weatherApiKey = '188ac5f2f74140ffab324609250708';
        this.weatherApiBase = 'https://api.weatherapi.com/v1';
        
        // 현재 상태
        this.currentWeather = null;
        this.currentLocation = null;
        this.selectedGenre = 'all';
        this.currentPlaylist = [];
        this.currentTrackIndex = 0;
        this.currentAudio = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.getCurrentLocationAndWeather();
    }
    
    bindEvents() {
        // 날씨 새로고침
        document.getElementById('refresh-weather').addEventListener('click', () => {
            this.getCurrentLocationAndWeather();
        });
        
        // 장르 필터
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectGenre(e.target.dataset.genre);
            });
        });
        
        // 플레이어 컨트롤
        document.getElementById('play-btn').addEventListener('click', () => {
            this.togglePlayPause();
        });
        
        document.getElementById('prev-btn').addEventListener('click', () => {
            this.previousTrack();
        });
        
        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextTrack();
        });
    }
    
    showLoading(show = true) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }
    
    async getCurrentLocationAndWeather() {
        this.showLoading(true);
        
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        this.getWeatherData(lat, lon);
                    },
                    (error) => {
                        console.error('위치 접근 실패:', error);
                        this.useDefaultLocation();
                    }
                );
            } else {
                this.useDefaultLocation();
            }
        } catch (error) {
            console.error('위치 서비스 오류:', error);
            this.useDefaultLocation();
        }
    }
    
    useDefaultLocation() {
        // 서울 기본 좌표
        this.getWeatherData(37.5665, 126.9780);
    }
    
    async getWeatherData(lat, lon) {
        try {
            const response = await fetch(
                `${this.weatherApiBase}/current.json?key=${this.weatherApiKey}&q=${lat},${lon}&aqi=yes&lang=ko`
            );
            
            if (!response.ok) {
                throw new Error('날씨 데이터를 가져올 수 없습니다');
            }
            
            const data = await response.json();
            this.currentWeather = data.current;
            this.currentLocation = data.location;
            
            this.updateWeatherDisplay();
            await this.getMusicRecommendations();
            
        } catch (error) {
            console.error('날씨 정보 가져오기 실패:', error);
            this.handleWeatherError();
        } finally {
            this.showLoading(false);
        }
    }
    
    handleWeatherError() {
        document.getElementById('location').textContent = '날씨 정보를 가져올 수 없습니다';
        document.getElementById('recommendation-reason').textContent = 
            '날씨 정보 없이 기본 음악을 추천합니다.';
        this.getMusicRecommendations(true);
    }
    
    updateWeatherDisplay() {
        const location = document.getElementById('location');
        const temperature = document.getElementById('temperature');
        const condition = document.getElementById('weather-condition');
        const weatherIcon = document.getElementById('weather-icon');
        const feelsLike = document.getElementById('feels-like');
        const humidity = document.getElementById('humidity');
        const windSpeed = document.getElementById('wind-speed');
        
        location.textContent = `${this.currentLocation.name}, ${this.currentLocation.country}`;
        temperature.textContent = `${Math.round(this.currentWeather.temp_c)}°C`;
        condition.textContent = this.currentWeather.condition.text;
        weatherIcon.src = `https:${this.currentWeather.condition.icon}`;
        weatherIcon.alt = this.currentWeather.condition.text;
        
        feelsLike.textContent = `${Math.round(this.currentWeather.feelslike_c)}°C`;
        humidity.textContent = `${this.currentWeather.humidity}%`;
        windSpeed.textContent = `${this.currentWeather.wind_kph} km/h`;
    }
    
    selectGenre(genre) {
        // 이전 선택 해제
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 현재 선택 활성화
        document.querySelector(`[data-genre="${genre}"]`).classList.add('active');
        this.selectedGenre = genre;
        
        this.getMusicRecommendations();
    }
    
    async getMusicRecommendations(useDefault = false) {
        try {
            let musicData;
            
            if (useDefault || !this.currentWeather) {
                musicData = this.getDefaultMusicData();
            } else {
                musicData = this.getWeatherBasedMusicData();
            }
            
            this.updateRecommendationReason(musicData.reason);
            await this.searchAppleMusicTracks(musicData.searchTerms);
            
        } catch (error) {
            console.error('음악 추천 생성 실패:', error);
            this.displayDefaultMusic();
        }
    }
    
    getWeatherBasedMusicData() {
        const weather = this.currentWeather;
        const condition = weather.condition.text.toLowerCase();
        const temp = weather.temp_c;
        const hour = new Date().getHours();
        
        let mood = '';
        let searchTerms = [];
        let reason = '';
        
        // 날씨 기반 기분 결정
        if (condition.includes('sunny') || condition.includes('clear')) {
            mood = 'upbeat';
            reason = `☀️ 맑은 날씨 (${Math.round(temp)}°C)에 어울리는 밝고 경쾌한 음악`;
        } else if (condition.includes('rain') || condition.includes('drizzle')) {
            mood = 'chill';
            reason = `🌧️ 비 오는 날 (${Math.round(temp)}°C)에 어울리는 차분하고 감성적인 음악`;
        } else if (condition.includes('snow')) {
            mood = 'peaceful';
            reason = `❄️ 눈 오는 날 (${Math.round(temp)}°C)에 어울리는 고요하고 아름다운 음악`;
        } else if (condition.includes('cloud') || condition.includes('overcast')) {
            mood = 'mellow';
            reason = `☁️ 흐린 날 (${Math.round(temp)}°C)에 어울리는 부드럽고 편안한 음악`;
        } else if (condition.includes('wind')) {
            mood = 'energetic';
            reason = `💨 바람 부는 날 (${Math.round(temp)}°C)에 어울리는 역동적인 음악`;
        } else {
            mood = 'ambient';
            reason = `🌤️ 오늘 날씨 (${Math.round(temp)}°C)에 어울리는 음악`;
        }
        
        // 시간대 고려
        if (hour >= 6 && hour < 12) {
            reason += ' - 상쾌한 아침을 위한 선곡';
        } else if (hour >= 12 && hour < 18) {
            reason += ' - 활기찬 오후를 위한 선곡';
        } else if (hour >= 18 && hour < 22) {
            reason += ' - 편안한 저녁을 위한 선곡';
        } else {
            reason += ' - 조용한 밤을 위한 선곡';
        }
        
        // 장르 기반 검색어 생성
        searchTerms = this.generateSearchTerms(mood);
        
        return { reason, searchTerms };
    }
    
    generateSearchTerms(mood) {
        const moodTerms = {
            upbeat: ['happy', 'upbeat', 'energetic', 'positive', 'sunshine'],
            chill: ['chill', 'rain', 'mellow', 'acoustic', 'indie'],
            peaceful: ['peaceful', 'calm', 'ambient', 'winter', 'soft'],
            mellow: ['mellow', 'smooth', 'relaxing', 'easy listening'],
            energetic: ['energetic', 'rock', 'pop', 'dance', 'workout'],
            ambient: ['ambient', 'atmospheric', 'dreamy', 'ethereal']
        };
        
        const genreTerms = {
            pop: ['pop', 'mainstream', 'chart'],
            rock: ['rock', 'alternative', 'indie rock'],
            jazz: ['jazz', 'smooth jazz', 'blues'],
            classical: ['classical', 'instrumental', 'piano'],
            electronic: ['electronic', 'edm', 'synthwave'],
            indie: ['indie', 'alternative', 'folk']
        };
        
        let terms = moodTerms[mood] || ['music'];
        
        if (this.selectedGenre !== 'all' && genreTerms[this.selectedGenre]) {
            terms = [...terms, ...genreTerms[this.selectedGenre]];
        }
        
        return terms.slice(0, 3); // 최대 3개 검색어
    }
    
    getDefaultMusicData() {
        return {
            reason: '🎵 오늘 하루를 위한 추천 음악',
            searchTerms: ['popular', 'trending', 'top hits']
        };
    }
    
    async searchAppleMusicTracks(searchTerms) {
        // Apple Music API는 인증이 필요하므로, 여기서는 시뮬레이션된 데이터를 사용
        // 실제 구현에서는 Apple Music API JWT 토큰이 필요합니다
        
        const simulatedTracks = this.getSimulatedMusicData(searchTerms);
        this.currentPlaylist = simulatedTracks;
        this.displayMusicRecommendations(simulatedTracks);
    }
    
    getSimulatedMusicData(searchTerms) {
        // 시뮬레이션된 Apple Music 스타일 데이터
        const trackDatabase = {
            happy: [
                {
                    id: '1',
                    title: 'Good 4 U',
                    artist: 'Olivia Rodrigo',
                    album: 'SOUR',
                    artwork: 'https://via.placeholder.com/200x200/ff6b6b/ffffff?text=🎵',
                    previewUrl: null
                },
                {
                    id: '2',
                    title: 'Levitating',
                    artist: 'Dua Lipa',
                    album: 'Future Nostalgia',
                    artwork: 'https://via.placeholder.com/200x200/4ecdc4/ffffff?text=🎶',
                    previewUrl: null
                }
            ],
            chill: [
                {
                    id: '3',
                    title: 'drivers license',
                    artist: 'Olivia Rodrigo',
                    album: 'SOUR',
                    artwork: 'https://via.placeholder.com/200x200/45b7d1/ffffff?text=🎼',
                    previewUrl: null
                },
                {
                    id: '4',
                    title: 'Cardigan',
                    artist: 'Taylor Swift',
                    album: 'folklore',
                    artwork: 'https://via.placeholder.com/200x200/96ceb4/ffffff?text=🎹',
                    previewUrl: null
                }
            ],
            peaceful: [
                {
                    id: '5',
                    title: 'Weightless',
                    artist: 'Marconi Union',
                    album: 'Ambient',
                    artwork: 'https://via.placeholder.com/200x200/ffeaa7/ffffff?text=🎺',
                    previewUrl: null
                },
                {
                    id: '6',
                    title: 'Clair de Lune',
                    artist: 'Claude Debussy',
                    album: 'Classical',
                    artwork: 'https://via.placeholder.com/200x200/dda0dd/ffffff?text=🎻',
                    previewUrl: null
                }
            ]
        };
        
        // 검색어에 따른 트랙 선택
        const firstTerm = searchTerms[0] || 'happy';
        let tracks = trackDatabase[firstTerm] || trackDatabase.happy;
        
        // 더 많은 트랙 생성 (실제로는 API에서 가져옴)
        const additionalTracks = [
            {
                id: '7',
                title: 'Blinding Lights',
                artist: 'The Weeknd',
                album: 'After Hours',
                artwork: 'https://via.placeholder.com/200x200/74b9ff/ffffff?text=🎤',
                previewUrl: null
            },
            {
                id: '8',
                title: 'Watermelon Sugar',
                artist: 'Harry Styles',
                album: 'Fine Line',
                artwork: 'https://via.placeholder.com/200x200/fd79a8/ffffff?text=🎸',
                previewUrl: null
            },
            {
                id: '9',
                title: 'positions',
                artist: 'Ariana Grande',
                album: 'Positions',
                artwork: 'https://via.placeholder.com/200x200/a29bfe/ffffff?text=🎙️',
                previewUrl: null
            },
            {
                id: '10',
                title: 'Therefore I Am',
                artist: 'Billie Eilish',
                album: 'Therefore I Am',
                artwork: 'https://via.placeholder.com/200x200/6c5ce7/ffffff?text=🎧',
                previewUrl: null
            }
        ];
        
        return [...tracks, ...additionalTracks].slice(0, 8);
    }
    
    displayMusicRecommendations(tracks) {
        const container = document.getElementById('music-recommendations');
        container.innerHTML = '';
        
        tracks.forEach((track, index) => {
            const trackElement = document.createElement('div');
            trackElement.className = 'music-item';
            trackElement.innerHTML = `
                <div class="music-title">${track.title}</div>
                <div class="music-artist">${track.artist}</div>
                <button class="play-preview-btn" onclick="app.openYouTube('${track.title}', '${track.artist}')">
                    재생하기
                </button>
            `;
            
            container.appendChild(trackElement);
        });
    }
    
    updateRecommendationReason(reason) {
        document.getElementById('recommendation-reason').textContent = reason;
    }
    
    playTrack(index) {
        if (index < 0 || index >= this.currentPlaylist.length) return;
        
        this.currentTrackIndex = index;
        const track = this.currentPlaylist[index];
        
        // 현재 재생 중인 오디오 정지
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        // 플레이어 UI 업데이트
        document.getElementById('current-title').textContent = track.title;
        document.getElementById('current-artist').textContent = track.artist;
        document.getElementById('current-album').textContent = track.album;
        
        // 플레이어 표시
        document.getElementById('music-player').style.display = 'block';
        
        // 실제 Apple Music API에서는 미리보기 URL을 사용
        // 여기서는 시뮬레이션
        console.log(`재생 중: ${track.title} - ${track.artist}`);
        
        // 재생 버튼 상태 업데이트
        document.getElementById('play-btn').textContent = '⏸️';
    }
    
    togglePlayPause() {
        const playBtn = document.getElementById('play-btn');
        
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            playBtn.textContent = '▶️';
        } else if (this.currentAudio) {
            this.currentAudio.play();
            playBtn.textContent = '⏸️';
        } else {
            // 새로운 트랙 재생
            if (this.currentPlaylist.length > 0) {
                this.playTrack(this.currentTrackIndex);
            }
        }
    }
    
    previousTrack() {
        if (this.currentTrackIndex > 0) {
            this.playTrack(this.currentTrackIndex - 1);
        }
    }
    
    nextTrack() {
        if (this.currentTrackIndex < this.currentPlaylist.length - 1) {
            this.playTrack(this.currentTrackIndex + 1);
        }
    }
    
    displayDefaultMusic() {
        const defaultTracks = [
            {
                id: 'default1',
                title: '음악을 불러올 수 없습니다',
                artist: '잠시 후 다시 시도해주세요',
                album: 'Error',
                artwork: 'https://via.placeholder.com/200x200/999999/ffffff?text=❌',
                previewUrl: null
            }
        ];
        
        this.displayMusicRecommendations(defaultTracks);
    }
    
    openYouTube(title, artist) {
        // 제목과 아티스트를 조합하여 YouTube 검색 쿼리 생성
        const searchQuery = encodeURIComponent(`${title} ${artist}`);
        const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
        
        // 새 탭에서 YouTube 검색 결과 열기
        window.open(youtubeUrl, '_blank');
        
        console.log(`YouTube에서 검색: ${title} - ${artist}`);
    }
}

// 전역 변수로 앱 인스턴스 생성
let app;

// 앱 시작
document.addEventListener('DOMContentLoaded', () => {
    app = new WeatherMusicApp();
});
