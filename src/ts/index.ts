import UIModel from './model/UIModel';
import UIController from './controller/UIController';
import UIView from './view/UIView';
import CanvasPool from './view/CanvasPool';

const model  		= new UIModel();
const view 			= new UIView(document);
const controller 	= new UIController(model, view);

controller.initializeMainPage();

