// models.rs
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct TransformStateObject {
    pub scale: f32,
    pub position_x: f32,
    pub position_y: f32,
}

pub struct BoundingBox {
    pub left: f32,
    pub top: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy)]
pub struct Coordinates {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Hitpoints {
    pub current: i32,
    pub max: i32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Entity {
    pub icon: String,
    pub allegiance: String,
    pub size: String,
    pub location: Coordinates,
    pub hitpoints: Hitpoints,
    pub visible: bool,
    pub dead: bool,
    pub modifiers: String,
}
