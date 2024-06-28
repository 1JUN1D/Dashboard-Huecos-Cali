const sideMenu = document.querySelector("aside");
const menuBtn = document.querySelector("#menu-btn");
const closeBtn = document.querySelector("#close-btn");
const themeToggler = document.querySelector(".theme-toggler")

menuBtn.addEventListener('click', () => { 
    sideMenu.style.display = 'block';
})

closeBtn.addEventListener('click', () => { 
    sideMenu.style.display = 'none';
})

themeToggler.addEventListener('click', () => { 
    document.body.classList.toggle('dark-theme-variables');
    if (document.body.classList.contains('dark-theme-variables')) {
        drawBarChartDark(puntosDataGlobal);
    } else {
        drawBarChartLight(puntosDataGlobal);
    }
})

// Inicializar el mapa y establecer la vista inicial
var map = L.map('map').setView([3.425592, -76.517052222], 12);

// Añadir la capa de los tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    minZoom: 12,
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd'
}).addTo(map);

// Definir los límites del mapa
const southWest = L.latLng(3.335592, -76.597052222),
    northEast = L.latLng(3.505592, -76.427052222);
const bounds = L.latLngBounds(southWest, northEast);

// Establecer los límites máximos del mapa
map.setMaxBounds(bounds);

// Ajustar la opción de arrastrar para mantener al usuario dentro de los límites
map.on('drag', function() {
    map.panInsideBounds(bounds, { animate: false });
});

// Definir el icono personalizado
var customIcon = L.icon({ iconUrl: 'images/samuel-marker-prueba.png', // Ruta a tu imagen 
    iconSize: [45, 67], // Tamaño del icono en píxeles 
    iconAnchor: [22.5, 67], // Punto de anclaje del icono (el centro en la base) 
    popupAnchor: [0, -67] // Punto de anclaje del popup 
    });

var puntosLayer, comunasLayer;
var puntosDataGlobal;
var markers = {};
var prevMarker = null;

// Función para obtener el color según el número de puntos
function getColor(d) {
    return d > 100 ? '#800026' :
           d > 50  ? '#BD0026' :
           d > 20  ? '#E31A1C' :
           d > 10  ? '#FC4E2A' :
           d > 5   ? '#FD8D3C' :
           d > 0   ? '#FEB24C' :
                     '#FFEDA0';
}

// Función para contar los puntos dentro de cada comuna
function countPointsInPolygons(polygons, points) {
    polygons.features.forEach(polygon => {
        polygon.properties.point_count = 0;
        points.features.forEach(point => {
            if (turf.inside(point, polygon)) {
                polygon.properties.point_count++;
            }
        });
    });
}

// Estilo para las comunas
function style(feature) {
    return {
        fillColor: getColor(feature.properties.point_count),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

// Función para resaltar la comuna
function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    layer.bringToFront();
    info.update(layer.feature.properties);
}

// Función para restablecer el resaltado
function resetHighlight(e) {
    comunasLayer.resetStyle(e.target);
    info.update();
}

// Función para hacer zoom a la comuna
function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

// Función para cada feature
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

// Control de información
var info = L.control({ position: 'bottomleft' });

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};

info.update = function (props) {
    this._div.innerHTML = '<h4 style="color: black;">Huecos por Comuna</h4>' +  
        (props ?
            '<b style="color: black;">' + props.nombre + '</b><br /><span style="color: black;">' + props.point_count + ' huecos reparchados</span>'
            : '<span style="color: black;">Pasa el mouse sobre una comuna</span>');
};

info.addTo(map);

// Leyenda
var legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend'),
        grades = [0, 5, 10, 20, 50, 100],
        labels = [];

    for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }

    return div;
};

legend.addTo(map);

// Función para actualizar el conteo de puntos en el DOM
function updatePointCount(pointCount) {
    document.getElementById('total-points').innerText = pointCount;
    document.getElementById('total-points-multiplied').innerText = pointCount * 20000;
}

// Función para contar los puntos por mes y dibujar el gráfico de barras para el tema claro
function drawBarChartLight(points) {
    var monthCount = {};

    points.features.forEach(point => {
        var month = point.properties.Mes;
        if (!monthCount[month]) {
            monthCount[month] = 0;
        }
        monthCount[month]++;
    });

    var months = Object.keys(monthCount);
    var counts = Object.values(monthCount);

    var colors = counts.map(count => getColor(count));

    var ctx = document.getElementById('barChart').getContext('2d');
    if (window.myBarChart) {
        window.myBarChart.destroy();
    }
    window.myBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'HUECOS TAPADOS POR MES',
                data: counts,
                backgroundColor: colors,
                borderColor: [
                    'rgba(0, 0, 0, 1)',
                ],
                borderWidth: 1,

                barPercentage: 0.9,
                categoryPercentage: 1,
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#000',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    ticks: {
                        color: '#000',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false,
                    labels: {
                        generateLabels: function(chart) {
                            return [{
                                text: 'HUECOS TAPADOS POR MES',
                                fillStyle: 'rgba(0, 0, 0, 0)', // Caja transparente
                                strokeStyle: 'rgba(0, 0, 0, 0)', // Borde transparente
                                lineWidth: 0 // Sin borde
                            }];
                        },
                        color: '#000',
                        font: {
                            size: 18
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleFont: {
                        size: 11
                    },
                    bodyFont: {
                        size: 11
                    }
                }
            }
        }
    });
}

// Función para contar los puntos por mes y dibujar el gráfico de barras para el tema oscuro
function drawBarChartDark(points) {
    var monthCount = {};

    points.features.forEach(point => {
        var month = point.properties.Mes;
        if (!monthCount[month]) {
            monthCount[month] = 0;
        }
        monthCount[month]++;
    });

    var months = Object.keys(monthCount);
    var counts = Object.values(monthCount);

    var colors = counts.map(count => getColor(count));

    var ctx = document.getElementById('barChart').getContext('2d');
    if (window.myBarChart) {
        window.myBarChart.destroy();
    }
    window.myBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'HUECOS TAPADOS POR MES',
                data: counts,
                backgroundColor: colors,
                borderColor: [
                    'rgba(0, 0, 0, 1)',
                ],
                borderWidth: 1,

                barPercentage: 0.9,
                categoryPercentage: 1,
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    grid: {
                        color: 'white' // Cambia el color de la grilla del eje x a rojo
                      },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#fff',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'white' // Cambia el color de la grilla del eje x a rojo
                      },
                    ticks: {
                        color: '#fff',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false,
                    labels: {
                        generateLabels: function(chart) {
                            return [{
                                text: 'HUECOS TAPADOS POR MES',
                                fillStyle: 'rgba(255, 255, 255, 0)', // Caja transparente
                                strokeStyle: 'rgba(255, 255, 255, 0)', // Borde transparente
                                lineWidth: 0 // Sin borde
                            }];
                        },
                        color: '#fff',
                        font: {
                            size: 18
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleFont: {
                        size: 11
                    },
                    bodyFont: {
                        size: 11
                    }
                }
            }
        }
    });
}

// Función para mostrar información del punto en el div
function showPointInfo(point) {
    var infoImage = document.getElementById('info-image');
    var infoDireccion = document.getElementById('info-direccion');
    var infoUbicacion = document.getElementById('info-ubicacion');
    var infoMes = document.getElementById('info-mes');

    infoImage.src = 'fotos/' + point.properties.FOTO + '.png';
    infoDireccion.innerText =  point.properties.DIRECCION;
    infoUbicacion.innerText = point.properties.UBICACION;
    infoMes.innerText = point.properties.Mes;
}

// Función para el desplazamiento automático de imágenes
function startSlideshow(points) {
    var index = 0;
    setInterval(function() {
        if (index >= points.length) {
            index = 0;
        }
        var point = points[index];
        showPointInfo(point);
        if (prevMarker) {
            resetMarker({ target: prevMarker });
        }
        var currentMarker = markers[point.properties.FOTO];
        elevateMarker({ target: currentMarker });
        prevMarker = currentMarker;
        index++;
    }, 10000); // Desplazamiento cada 10 segundos
}

// Funciones para elevar el marcador y añadir sombra
function elevateMarker(e) { var marker = e.target; marker.setIcon(L.icon({ iconUrl: './images/samuel-marker-blanco.png', // Ruta a tu imagen 
    iconSize: [45, 70], // Tamaño más grande del icono 
    iconAnchor: [22.5, 70], // Punto de anclaje del icono (el centro en la base) 
    shadowSize: [60, 80], // Tamaño más grande de la sombra 
    shadowAnchor: [5, 80],  // Punto de anclaje de la sombra 
    popupAnchor: [0, -70] // Punto de anclaje del popup 
    })); }

function resetMarker(e) {
    var marker = e.target;
    marker.setIcon(customIcon); // Restaurar el icono original
}

document.getElementById('facebook-img').addEventListener('click', function() {
    window.open('https://www.facebook.com/profile.php?id=61554592300428', '_blank');
});

document.getElementById('facebook-text').addEventListener('click', function() {
    window.open('https://www.facebook.com/profile.php?id=61554592300428', '_blank');
});


document.getElementById('tiktok-img').addEventListener('click', function() {
    window.open('https://www.tiktok.com/@samy_ofendidotantohueco', '_blank');
});

document.getElementById('tiktok-text').addEventListener('click', function() {
    window.open('https://www.tiktok.com/@samy_ofendidotantohueco', '_blank');
});

document.getElementById('insta-img').addEventListener('click', function() {
    window.open('https://www.instagram.com/samuel.merchan.315?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', '_blank');
});

document.getElementById('insta-text').addEventListener('click', function() {
    window.open('https://www.instagram.com/samuel.merchan.315?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', '_blank');
});


// Cargar las capas GeoJSON
Promise.all([
    fetch('comunas_cali.geojson').then(response => response.json()),
    fetch('puntos.geojson').then(response => response.json())
]).then(data => {
    var comunasData = data[0];
    var puntosData = data[1];
    puntosDataGlobal = puntosData;

    // Contar puntos en cada comuna
    countPointsInPolygons(comunasData, puntosData);

    // Añadir capa de comunas
    comunasLayer = L.geoJson(comunasData, {
        style: style,
        onEachFeature: onEachFeature
    });

    // Añadir capa de puntos
    puntosLayer = L.geoJson(puntosData, {
        pointToLayer: function (feature, latlng) {
            var marker = L.marker(latlng, { icon: customIcon });
            marker.on('mouseover', elevateMarker);
            marker.on('mouseout', resetMarker);
            marker.on('click', function() {
                showPointInfo(feature);
                if (prevMarker) {
                    resetMarker({ target: prevMarker });
                }
                elevateMarker({ target: marker });
                prevMarker = marker;
            });
            markers[feature.properties.FOTO] = marker;
            return marker;
        }
    });

    // Añadir control de capas
    var overlayMaps = {
        "Comunas": comunasLayer,
        "Huecos": puntosLayer
    };

    L.control.layers(null, overlayMaps, { collapsed: true, position: 'topright' }).addTo(map);

    // Añadir capas al mapa
    comunasLayer.addTo(map);
    puntosLayer.addTo(map);

    // Actualizar el conteo de puntos en el DOM
    updatePointCount(puntosData.features.length);

    // Dibujar el gráfico de barras según el tema actual
    if (document.body.classList.contains('dark-theme-variables')) {
        drawBarChartDark(puntosData);
    } else {
        drawBarChartLight(puntosData);
    }

    // Iniciar el slideshow
    startSlideshow(puntosData.features);
});
