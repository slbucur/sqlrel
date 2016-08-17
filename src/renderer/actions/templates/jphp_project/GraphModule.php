<?php
#package <insert package here>

#import jphp.ddp.DDP
#import jphp.ui.DefaultAppLoader
#import org.athon.base.AbstractModuleUI

class GraphModule extends AbstractModuleUI{

	public function dOutput(){
		$this->execute();
		return $this->dRender();
	}

	public function prepareDefault(){
	        $this->loadStaticFiles();
	}

	public static function arGetData(){
		$m = &Core::getDB();
		$query = "{query}";
		$res = $m->aQuery($query);

		return self::jsonize($res);
	}

	public function loadStaticFiles(){
		$jsFiles = array(
			'&cytoscape.js',
			'&relations.js',
		);
		$cssFiles = array(
			'&relations.css',
		);

		$basePath = '<insert path to module here>';
		$basePathJS = $basePath."/js/";
		$basePathCSS = $basePath."/css/";
		$parameters=array("FORMNAME"=>$this->getCRC());

		$this->loadFiles($basePathJS, $jsFiles, false, $parameters);
		$this->loadFiles($basePathCSS, $cssFiles, false, $parameters);

	}

	public function loadFiles($basePath, $files, $isInline, $parameters){
		foreach($files as $file){
			$addr = $basePath.$file;
			if(strpos($file, '&') === 0){
				$file = str_replace('&', '', $file);
				$addr = '&'.$basePath.$file;
			}
			DefaultAppLoader::loadResource( $address = $addr, $inline = $isInline, $parameters);
		}
	}

	public static function jsonize($data){
		return json_encode($data,JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
	}


}
