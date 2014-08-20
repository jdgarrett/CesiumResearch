/*global define*/
var viewer = null;
define([
        'Cesium',
        'Core/defined',
        'Core/formatError',
        'Core/getFilenameFromUri',
        'DataSources/CzmlDataSource',
        'DataSources/GeoJsonDataSource',
        'DataSources/ConstantProperty',
        'Scene/TileMapServiceImageryProvider',
        'Widgets/Viewer/Viewer',
        'Widgets/Viewer/viewerCesiumInspectorMixin',
        'Widgets/Viewer/viewerDragDropMixin',
        'Widgets/Viewer/viewerEntityMixin',
        'domReady!'
    ], function(
        Cesium,
        defined,
        formatError,
        getFilenameFromUri,
        CzmlDataSource,
        GeoJsonDataSource,
        ConstantProperty,
        TileMapServiceImageryProvider,
        Viewer,
        viewerCesiumInspectorMixin,
        viewerDragDropMixin,
        viewerEntityMixin) {
    "use strict";
    /*global console*/

    /*
     * 'debug'  : true/false,   // Full WebGL error reporting at substantial performance cost.
     * 'lookAt' : CZML id,      // The CZML ID of the object to track at startup.
     * 'source' : 'file.czml',  // The relative URL of the CZML file to load at startup.
     * 'stats'  : true,         // Enable the FPS performance display.
     * 'theme'  : 'lighter',    // Use the dark-text-on-light-background theme.
     * 'scene3DOnly' : false    // Enable 3D only mode
     */
    var endUserOptions = {};
    var queryString = window.location.search.substring(1);
    if (queryString !== '') {
        var params = queryString.split('&');
        for (var i = 0, len = params.length; i < len; ++i) {
            var param = params[i];
            var keyValuePair = param.split('=');
            if (keyValuePair.length > 1) {
                endUserOptions[keyValuePair[0]] = decodeURIComponent(keyValuePair[1].replace(/\+/g, ' '));
            }
        }
    }

    var loadingIndicator = document.getElementById('loadingIndicator');

    var imageryProvider;

    if (endUserOptions.tmsImageryUrl) {
        imageryProvider = new TileMapServiceImageryProvider({
            url : endUserOptions.tmsImageryUrl
        });
    }

    try {
        viewer = new Viewer('cesiumContainer', {
            imageryProvider : imageryProvider,
            baseLayerPicker : !defined(imageryProvider),
            scene3DOnly : endUserOptions.scene3DOnly
        });
    } catch (exception) {
        loadingIndicator.style.display = 'none';
        var message = formatError(exception);
        console.error(message);
        if (!document.querySelector('.cesium-widget-errorPanel')) {
            window.alert(message);
        }
        return;
    }

    viewer.extend(viewerDragDropMixin);
    viewer.extend(viewerEntityMixin);
    if (endUserOptions.inspector) {
        viewer.extend(viewerCesiumInspectorMixin);
    }
    var buildingsURL = 'http://192.168.10.114/geoserver/geonode/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geonode:cathederal_parts&propertyName=ht,min_ht,levels,min_levels&outputFormat=application/json';
    var dataSource = new GeoJsonDataSource();
    viewer.dataSources.add(dataSource);
    dataSource.loadUrl(buildingsURL).then(function() {
      console.log("loaded: ", dataSource.entities);
      // Set material
      if(dataSource.entities.entities.length > 0) {
        dataSource.entities.entities[0].polygon.material.color.setValue(Cesium.Color.ANTIQUEWHITE);
        dataSource.entities.entities[0].polygon.outline.setValue(false);
      }
      // Set heights
      for (var idx = 0; idx < dataSource.entities.entities.length; idx++) {
        var entity = dataSource.entities.entities[idx];
        if(entity.properties.ht !== null && entity.properties.ht !== undefined) {
          entity.polygon.extrudedHeight = new ConstantProperty(parseFloat(entity.properties.ht));
        } else if (entity.properties.levels !== null && entity.properties.levels !== undefined) {
          entity.polygon.extrudedHeight = new ConstantProperty(parseFloat(entity.properties.levels.replace(/\D/g, '')) * 3);
        } else {
          entity.polygon.extrudedHeight = new ConstantProperty(3);
        }
        if (entity.properties.min_ht !== null && entity.properties.min_ht !== undefined) {
          entity.polygon.height = new ConstantProperty(parseFloat(entity.properties.min_ht));
        } else if (entity.properties.min_levels !== null && entity.properties.min_levels !== undefined) {
          entity.polygon.height = new ConstantProperty(parseFloat(entity.properties.min_levels.replace(/\D/g, '')) * 3);
        } else {
          entity.polygon.height = new ConstantProperty(0);
        }
      }
    }, function(error) {
      console.log("failed: ", error);
    });

    buildingsURL = 'buildings.json';
    var dataSource2 = new GeoJsonDataSource();
    viewer.dataSources.add(dataSource2);
  dataSource2.loadUrl(buildingsURL).then(function() {
      console.log("loaded: ", dataSource2.entities);
      // Set material
      if (dataSource2.entities.entities.length > 0) {
        dataSource2.entities.entities[0].polygon.material.color.setValue(Cesium.Color.ANTIQUEWHITE);
        dataSource2.entities.entities[0].polygon.outline.setValue(false);
      }
      // Set heights
      for (var idx = 0; idx < dataSource2.entities.entities.length; idx++) {
        var entity = dataSource2.entities.entities[idx];
        if (entity.properties.height !== null && entity.properties.height !== undefined) {
          entity.polygon.extrudedHeight = new ConstantProperty(parseFloat(entity.properties.height));
        } else if (entity.properties.levels !== null && entity.properties.levels !== undefined) {
          entity.polygon.extrudedHeight = new ConstantProperty(parseFloat(entity.properties.levels.replace(/\D/g, '')) * 3);
        } else {
          entity.polygon.extrudedHeight = new ConstantProperty(3 + Math.random()*75);
        }
        entity.polygon.height = new ConstantProperty(0);
      }
    }, function(error) {
      console.log("failed: ", error);
    });

    var layers = viewer.scene.imageryLayers;
    console.log('layers: ', layers);
  console.log('dataSources', viewer.dataSources);
    //var wmsLayer =
    //    layers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
    //    url: 'http://geoserver2.rogue.lmnsolutions.com/geoserver/wms/geonode:incidentes_od3'
    //}));

    var showLoadError = function(name, error) {
        var title = 'An error occurred while loading the file: ' + name;
        var message = 'An error occurred while loading the file, which may indicate that it is invalid.  A detailed error report is below:';
        viewer.cesiumWidget.showErrorPanel(title, message, error);
    };

    viewer.dropError.addEventListener(function(viewerArg, name, error) {
        showLoadError(name, error);
    });

    var scene = viewer.scene;
    var context = scene.context;
    if (endUserOptions.debug) {
        context.validateShaderProgram = true;
        context.validateFramebuffer = true;
        context.logShaderCompilation = true;
        context.throwOnWebGLError = true;
    }

    var source = endUserOptions.source;
    if (defined(source)) {
        var dataSource;
        var loadPromise;

        if (/\.czml$/i.test(source)) {
            dataSource = new CzmlDataSource(getFilenameFromUri(source));
            loadPromise = dataSource.loadUrl(source);
        } else if (/\.geojson$/i.test(source) || /\.json$/i.test(source) || /\.topojson$/i.test(source)) {
            dataSource = new GeoJsonDataSource(getFilenameFromUri(source));
            loadPromise = dataSource.loadUrl(source);
        } else {
            showLoadError(source, 'Unknown format.');
        }

        if (defined(dataSource)) {
            viewer.dataSources.add(dataSource);

            loadPromise.then(function() {
                var lookAt = endUserOptions.lookAt;
                if (defined(lookAt)) {
                    var entity = dataSource.entities.getById(lookAt);
                    if (defined(entity)) {
                        viewer.trackedEntity = entity;
                    } else {
                        var error = 'No entity with id "' + lookAt + '" exists in the provided data source.';
                        showLoadError(source, error);
                    }
                }
            }).otherwise(function(error) {
                showLoadError(source, error);
            });
        }
    }

    if (endUserOptions.stats) {
        scene.debugShowFramesPerSecond = true;
    }

    var theme = endUserOptions.theme;
    if (defined(theme)) {
        if (endUserOptions.theme === 'lighter') {
            document.body.classList.add('cesium-lighter');
            viewer.animation.applyThemeChanges();
        } else {
            var error = 'Unknown theme: ' + theme;
            viewer.cesiumWidget.showErrorPanel(error, '');
        }
    }

    loadingIndicator.style.display = 'none';
});
