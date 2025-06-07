// Standard library imports
use std::collections::HashSet;
use std::fs::{self, File, OpenOptions};
use std::io::{self, BufRead, BufReader, Read, Write, Result};
use std::path::{Path, PathBuf};

// External crate imports
use rand::{distributions::Alphanumeric, Rng};
use serde_json::{json, Value};

// Image processing
use image::{DynamicImage, GenericImage, GenericImageView, Rgba, imageops::crop};
use imageproc::drawing::{draw_polygon_mut, draw_line_segment_mut};
use imageproc::point::Point;

// Project-specific imports
use crate::models::{BoundingBox, TransformStateObject, Entity, Coordinates};

// File dialog for user interaction
use native_dialog::FileDialog;


pub fn list_files_in_directory(dir: &str) -> io::Result<Vec<String>> {
    let path = Path::new(dir);
    
    // Read the directory contents
    let mut file_names = Vec::new();
    
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let path = entry.path();
        
        // Check if it's a file (not a directory)
        if path.is_file() {
            // Get the file name as a string and push it to the list
            if let Some(file_name) = path.file_name() {
                if let Some(file_name_str) = file_name.to_str() {
                    file_names.push(file_name_str.to_string());
                }
            }
        }
    }
    
    Ok(file_names)
}
  
pub fn extract_chapter_name(file_name: &str) -> Option<String> {
// Check if the file name starts with "chapter_" and ends with ".json"
if file_name.starts_with("chapter_") && file_name.ends_with(".json") {
    // Strip the "chapter_" prefix and ".json" suffix
    let chapter_part = &file_name["chapter_".len()..file_name.len() - ".json".len()];

    // Capitalize the chapter part (if needed) to follow the "Chapter X" format
    let formatted_chapter = capitalize_first_letter(chapter_part);

    // Return the formatted string "Chapter X"
    return Some(format!("Chapter {}", formatted_chapter));
}

// If the format doesn't match, return None
None
}
  
// Helper function to capitalize the first letter of the chapter part
pub fn capitalize_first_letter(s: &str) -> String {
let mut chars = s.chars();
match chars.next() {
    None => String::new(), // If the string is empty, return an empty string
    Some(first_char) => first_char.to_uppercase().collect::<String>() + chars.as_str(),
}
}

// Function to open file explorer and return the selected image paths
pub fn select_image_files() -> Option<Vec<PathBuf>> {
    // Opens a file dialog for selecting multiple images
    FileDialog::new()
        .add_filter("Image files", &["png", "jpg", "jpeg", "gif"])
        .show_open_multiple_file()
        .ok()
}

// Single image version
pub fn select_image_file() -> Option<PathBuf> {
    // Opens a file dialog for selecting a single image
    FileDialog::new()
        .add_filter("Image files", &["png", "jpg", "jpeg", "gif"])
        .show_open_single_file()
        .ok()?
}

/// Function that takes an image path and an output directory and saves the image into the output directory
/// This version does not return anything, just propagates errors if any occur.
pub fn save_image_to_directory(image_path: &Path, output_directory: &Path) -> Result<()> {
    // Ensure the output directory exists
    if !output_directory.exists() {
        fs::create_dir_all(output_directory)?;
    }

    // Get the file name of the image from the input path
    if let Some(file_name) = image_path.file_name() {
        // Define the destination path as output_directory/image_file_name
        let destination_path = output_directory.join(file_name);

        // Copy the image to the destination
        fs::copy(image_path, &destination_path)?;

        // No need to return anything, operation successful
        Ok(())
    } else {
        // Return an error if the image file doesn't have a valid file name
        Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Invalid image file name",
        ))
    }
}

/// Function that takes an image path and returns the image filename as a String
pub fn get_image_filename(image_path: &Path) -> Option<String> {
    image_path.file_name()
        .and_then(|name| name.to_str())  // Convert OsStr to &str
        .map(|name_str| name_str.to_string())  // Convert &str to String
}

// Function to format chapter ID into the JSON filename in the desired path
pub fn format_chapter_id(input: &str) -> PathBuf {
    let lowercase_input = input.to_lowercase();
    // Construct the path as `../tableau/chapters/chapter_<id>.json`
    PathBuf::from(format!("../tableau/chapters/chapter_{}.json", lowercase_input))
}

// Function to update only the 'landscapes' field of the JSON file
pub fn update_landscapes(chapter_id: String, new_landscapes: Vec<String>) -> io::Result<()> {
    // Convert chapter ID to the JSON filename
    let path = format_chapter_id(&chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut json_value: Value = if path.exists() {
        let mut file = File::open(&path)?;
        let mut content = String::new();
        file.read_to_string(&mut content)?;

        // Parse the content into a `Value`
        serde_json::from_str(&content).unwrap_or_else(|_| {
            // Create default structure if parsing fails
            json!({
                "landscapes": [],
                "splashes": [],
                "combat": []
            })
        })
    } else {
        // If the file doesn't exist, create a default structure
        json!({
            "landscapes": [],
            "splashes": [],
            "combat": []
        })
    };

    // Get the existing landscapes
    let existing_landscapes: HashSet<String> = if let Some(landscapes) = json_value.get("landscapes") {
        if let Some(array) = landscapes.as_array() {
            // Convert existing landscapes array into a HashSet to avoid duplicates
            array.iter()
                .filter_map(|v| v.as_str().map(String::from))  // Convert `Value` to `String`
                .collect()
        } else {
            HashSet::new()
        }
    } else {
        HashSet::new()  // If no landscapes field exists, start with an empty set
    };

    // Convert new landscapes into a HashSet to avoid duplicates
    let new_landscapes_set: HashSet<String> = new_landscapes.into_iter().collect();

    // Combine the two sets, retaining only unique values
    let combined_landscapes: HashSet<String> = existing_landscapes.union(&new_landscapes_set).cloned().collect();

    // Update the 'landscapes' field in the JSON object with the combined set (convert to Vec for JSON)
    let landscape_values: Vec<Value> = combined_landscapes.into_iter().map(Value::String).collect();
    json_value["landscapes"] = Value::Array(landscape_values);

    // Open the file for writing and write the updated JSON data
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)  // Clear the file before writing new content
        .open(&path)?;

    let updated_content = serde_json::to_string_pretty(&json_value)?;
    file.write_all(updated_content.as_bytes())?;

    Ok(())
}

// Function to update only the 'splashes' field of the JSON file
pub fn update_splashes(chapter_id: String, new_splashes: Vec<String>) -> io::Result<()> {
    // Convert chapter ID to the JSON filename
    let path = format_chapter_id(&chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut json_value: Value = if path.exists() {
        let mut file = File::open(&path)?;
        let mut content = String::new();
        file.read_to_string(&mut content)?;

        // Parse the content into a `Value`
        serde_json::from_str(&content).unwrap_or_else(|_| {
            // Create default structure if parsing fails
            json!({
                "landscapes": [],
                "splashes": [],
                "combat": []
            })
        })
    } else {
        // If the file doesn't exist, create a default structure
        json!({
            "landscapes": [],
            "splashes": [],
            "combat": []
        })
    };

    // Get the existing splashes as a set of (image, allegiance) tuples
    let existing_splashes: HashSet<(String, String)> = if let Some(splashes) = json_value.get("splashes") {
        if let Some(array) = splashes.as_array() {
            array.iter()
                .filter_map(|v| {
                    if let Some(image) = v.get("image").and_then(|img| img.as_str()) {
                        let allegiance = v.get("allegiance").and_then(|a| a.as_str()).unwrap_or("neutral").to_string();
                        Some((image.to_string(), allegiance))
                    } else {
                        None
                    }
                })
                .collect()
        } else {
            HashSet::new()
        }
    } else {
        HashSet::new()  // If no splashes field exists, start with an empty set
    };

    // Create new splashes as (image, allegiance) tuples with default "neutral" allegiance
    let new_splashes_set: HashSet<(String, String)> = new_splashes.into_iter()
        .map(|image| (image, "neutral".to_string()))  // New splashes default to "neutral"
        .collect();

    // Combine the two sets, retaining only unique values (by image name)
    let combined_splashes: HashSet<(String, String)> = existing_splashes.union(&new_splashes_set).cloned().collect();

    // Convert the combined splashes into the correct JSON format (array of objects)
    let splash_values: Vec<Value> = combined_splashes.into_iter()
        .map(|(image, allegiance)| {
            json!({
                "image": image,
                "allegiance": allegiance
            })
        })
        .collect();

    // Update the 'splashes' field in the JSON object with the new structure
    json_value["splashes"] = Value::Array(splash_values);

    // Open the file for writing and write the updated JSON data
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)  // Clear the file before writing new content
        .open(&path)?;

    let updated_content = serde_json::to_string_pretty(&json_value)?;
    file.write_all(updated_content.as_bytes())?;

    Ok(())
}

// updates the combat field of the JSON file
pub fn update_combat(chapter_id: String, battlemap: String) -> io::Result<()> {
    // Get the path of the chapter JSON file
    let chapter_path = format_chapter_id(&chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut json_value: Value = if chapter_path.exists() {
        let mut file = File::open(&chapter_path)?;
        let mut content = String::new();
        file.read_to_string(&mut content)?;

        // Parse the content into a `Value`
        serde_json::from_str(&content).unwrap_or_else(|_| {
            // Create default structure if parsing fails
            json!({
                "landscapes": [],
                "splashes": [],
                "combat": []
            })
        })
    } else {
        // If the file doesn't exist, create a default structure
        json!({
            "landscapes": [],
            "splashes": [],
            "combat": []
        })
    };

    // Create a new combat object
    let new_combat = json!({
        "battlemap": battlemap,
        "mapsize": 100,
        "mapoffset": {
            "x": 0,
            "y": 0
        },
        "gridsize": 100,
        "gridoffset": {
            "x": 0,
            "y": 0
        },
        "entities": []
    });

    // Append the new combat object to the `combat` field
    if let Some(combat_array) = json_value["combat"].as_array_mut() {
        combat_array.push(new_combat);
    } else {
        // If combat is not an array, initialize it as an empty array and add the new object
        json_value["combat"] = json!([new_combat]);
    }

    // Open the file for writing and write the updated JSON data
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)  // Clear the file before writing new content
        .open(&chapter_path)?;

    let updated_content = serde_json::to_string_pretty(&json_value)?;
    file.write_all(updated_content.as_bytes())?;

    Ok(())
}

// Updated function to create a hexagonal mask with boundary vertices
pub fn create_hex_mask(width: u32, height: u32) -> DynamicImage {
    let mut mask = DynamicImage::new_rgba8(width, height);
    let mut hex_points = Vec::new();

    let center_x = width as f32 / 2.0;
    let center_y = height as f32 / 2.0;

    // Calculate the hexagon size so that its vertices touch the boundaries
    let size = f32::min(width as f32 / (3.0_f32.sqrt()), height as f32 / 2.0);

    // Calculate the hexagon vertices with a 30-degree rotation for flat-top orientation
    for i in 0..6 {
        let angle = std::f32::consts::PI / 6.0 + (std::f32::consts::PI / 3.0) * i as f32;
        let x = center_x + size * angle.cos();
        let y = center_y + size * angle.sin();
        hex_points.push(Point::new(x as i32, y as i32));
    }

    // Draw the filled polygon on the mask image
    draw_polygon_mut(&mut mask, &hex_points, Rgba([255, 255, 255, 255]));

    mask
}


pub fn add_hex_stroke(image: &DynamicImage, allegiance: &str) -> DynamicImage {
    let (width, height) = image.dimensions();
    let stroke_width = 20;
    
    // Create a larger canvas to accommodate the stroke
    let new_width = width + stroke_width * 2;
    let new_height = height + stroke_width * 2;
    
    // Determine stroke color based on allegiance
    let stroke_color = match allegiance {
        "evil" => Rgba([255, 0, 0, 255]), // Red for evil
        _ => Rgba([255, 255, 255, 255]),  // White for neutral (default)
    };
    
    // Step 1: Create enlarged stroke hexagon mask
    let enlarged_hex_mask = create_hex_mask(new_width, new_height);
    
    // Step 2: Create stroke layer by filling enlarged mask with stroke color
    let mut stroke_layer = DynamicImage::new_rgba8(new_width, new_height);
    for y in 0..new_height {
        for x in 0..new_width {
            let mask_pixel = enlarged_hex_mask.get_pixel(x, y);
            if mask_pixel[3] > 0 { // If mask pixel is not transparent
                stroke_layer.put_pixel(x, y, stroke_color);
            }
        }
    }
    
    // Step 3: Layer the original image on top, centered
    for y in 0..height {
        for x in 0..width {
            let original_pixel = image.get_pixel(x, y);
            if original_pixel[3] > 0 { // If original pixel is not transparent
                stroke_layer.put_pixel(x + stroke_width, y + stroke_width, original_pixel);
            }
        }
    }
    
    stroke_layer
}

/// Function to apply a mask to an image
pub fn apply_mask(image: &DynamicImage, mask: &DynamicImage) -> DynamicImage {
    let (width, height) = image.dimensions();
    let mut output = DynamicImage::new_rgba8(width, height);

    for y in 0..height {
        for x in 0..width {
            let mask_pixel = mask.get_pixel(x, y);
            if mask_pixel[3] > 0 {
                output.put_pixel(x, y, image.get_pixel(x, y));
            } else {
                output.put_pixel(x, y, Rgba([0, 0, 0, 0])); // Transparent pixel
            }
        }
    }

    output
}

pub fn crop_to_content(image: &mut DynamicImage) -> DynamicImage {
    let (width, height) = image.dimensions();
    
    // Variables to store the bounding box of non-transparent pixels
    let mut left = width;
    let mut right = 0;
    let mut top = height;
    let mut bottom = 0;
    
    // Iterate over all pixels to find the bounding box of non-transparent pixels
    for y in 0..height {
        for x in 0..width {
            let pixel = image.get_pixel(x, y);
            
            // Check if the pixel is non-transparent
            if pixel[3] > 0 {
                if x < left {
                    left = x;
                }
                if x > right {
                    right = x;
                }
                if y < top {
                    top = y;
                }
                if y > bottom {
                    bottom = y;
                }
            }
        }
    }

    // If no non-transparent pixels were found, return the original image
    if left >= right || top >= bottom {
        return image.clone();
    }

    // Crop the image to the bounding box
    image.crop(left, top, right - left + 1, bottom - top + 1)
}


pub fn generate_icon_id() -> Result<String> {
    // Hard-coded file path
    let file_path = "../tableau/entities/entity_ids.txt";

    // Ensure the directory exists
    if let Some(parent) = Path::new(file_path).parent() {
        fs::create_dir_all(parent)?;
    }

    // Load existing IDs into a HashSet to check for duplicates
    let mut existing_ids = HashSet::new();
    if Path::new(file_path).exists() {
        let file = File::open(file_path)?;
        let reader = BufReader::new(file);
        for line in reader.lines() {
            existing_ids.insert(line?);
        }
    }

    // Generate a new random alphanumeric ID
    let mut icon_id: String;
    loop {
        icon_id = rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .take(10)
            .map(char::from)
            .collect();

        // Check if the generated ID is unique
        if !existing_ids.contains(&icon_id) {
            break;
        }
    }

    // Open the file in append mode and write the new ID
    let mut file = OpenOptions::new().append(true).create(true).open(file_path)?;
    writeln!(file, "{}", icon_id)?;

    Ok(icon_id)
}

/// Function to generate an entity icon, crop the image based on the given bounding box
/// and transformation state, apply a hex mask, and save it using the given icon ID.
pub fn generate_entity_icon(
    filename: &str,
    transform_state: TransformStateObject,
    icon_id: &str,
    allegiance: &str,
) -> std::result::Result<String, io::Error> {
    let bounding_box = BoundingBox {
        left: 129.75,
        top: 115.0,
        width: 190.5,
        height: 220.0,
    };

    let container_width = 450.0;
    let container_height = 450.0;

    let base_directory = Path::new("../tableau/assets/iconimages");
    let image_path = base_directory.join(filename);

    if !image_path.exists() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("File '{}' not found.", filename),
        ));
    }

    let mut img = match image::open(&image_path) {
        Ok(image) => image,
        Err(err) => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("Failed to open image: {}", err),
            ));
        }
    };
    let (resolution_width, resolution_height) = img.dimensions();

    let scale_factor_x = resolution_width as f32 / container_width;
    let scale_factor_y = resolution_height as f32 / container_height;

    let adjusted_left = (bounding_box.left - transform_state.position_x) / transform_state.scale;
    let adjusted_top = (bounding_box.top - transform_state.position_y) / transform_state.scale;
    let adjusted_width = bounding_box.width / transform_state.scale;
    let adjusted_height = bounding_box.height / transform_state.scale;

    let crop_x = (adjusted_left * scale_factor_x).floor() as u32;
    let crop_y = (adjusted_top * scale_factor_y).floor() as u32;
    let crop_width = (adjusted_width * scale_factor_x).floor() as u32;
    let crop_height = (adjusted_height * scale_factor_y).floor() as u32;

    let cropped_img = crop(&mut img, crop_x, crop_y, crop_width, crop_height);

    let hex_mask = create_hex_mask(crop_width, crop_height);
    let mut masked_image = apply_mask(&DynamicImage::ImageRgba8(cropped_img.to_image()), &hex_mask);
    
    // Add stroke to the masked image
    masked_image = add_hex_stroke(&masked_image, allegiance);
    let final_image = crop_to_content(&mut masked_image);

    let output_directory = Path::new("../tableau/assets/entities");

    if !output_directory.exists() {
        if let Err(err) = std::fs::create_dir_all(output_directory) {
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("Failed to create output directory: {}", err),
            ));
        }
    }

    let output_path = output_directory.join(format!("{}.png", icon_id));

    match final_image.save(&output_path) {
        Ok(_) => Ok(format!("Hexagonally masked image saved as '{}'.", output_path.display())),
        Err(err) => Err(io::Error::new(
            io::ErrorKind::Other,
            format!("Failed to save hexagonally masked image: {}", err),
        )),
    }
}

/// Function to create a new entity JSON file with the given icon ID, allegiance, and size.
/// The entity is saved as `iconid.json` in the directory `../tableau/entities`.
pub fn create_entity(icon_id: &str, allegiance: &str, entity_size: &str) -> io::Result<()> {
    // Define the directory where the entity file will be stored
    let output_directory = Path::new("../tableau/entities");

    // Ensure the directory exists
    if !output_directory.exists() {
        std::fs::create_dir_all(output_directory)?;
    }

    // Construct the file path as `../tableau/entities/iconid.json`
    let file_path = output_directory.join(format!("{}.json", icon_id));

    // Create the entity JSON object
    let entity_data = json!({
        "icon": format!("{}.png", icon_id),
        "allegiance": allegiance,
        "size": entity_size,
        "location": {
            "x": 0,
            "y": 0
        },
        "hitpoints": {
            "current": 0,
            "max": 0
        },
        "visible": true,
        "dead": false,
        "modifiers": ""
    });

    // Open the file for writing (create or truncate)
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&file_path)?;

    // Write the JSON data to the file
    let content = serde_json::to_string_pretty(&entity_data)?;
    file.write_all(content.as_bytes())?;

    Ok(())
}

/// Function to update the entities array in a specified combat object within the chapter JSON file.
/// Appends the given `iconid.json` to the `entities` array in the combat object that matches the `battlemapid`.
pub fn update_entities(chapter_id: &str, battlemap_id: &str, icon_id: &str) -> io::Result<()> {
    // Get the path of the chapter JSON file
    let chapter_path = format_chapter_id(chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut json_value: Value = if chapter_path.exists() {
        let mut file = std::fs::File::open(&chapter_path)?;
        let mut content = String::new();
        file.read_to_string(&mut content)?;

        // Parse the content into a `Value`
        serde_json::from_str(&content).unwrap_or_else(|_| {
            // Create default structure if parsing fails
            json!({
                "landscapes": [],
                "splashes": [],
                "combat": []
            })
        })
    } else {
        // If the file doesn't exist, create a default structure
        json!({
            "landscapes": [],
            "splashes": [],
            "combat": []
        })
    };

    // Find the matching battlemap object in the `combat` array
    let combat_array = json_value
        .get_mut("combat")
        .and_then(|c| c.as_array_mut())
        .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "Combat array not found"))?;

    for combat in combat_array.iter_mut() {
        if let Some(battlemap) = combat.get("battlemap").and_then(|b| b.as_str()) {
            if battlemap == battlemap_id {
                // Check if the "entities" field exists, and create an empty array if it does not
                if !combat.get("entities").is_some() {
                    combat["entities"] = json!([]);
                }
                // Now, safely get the mutable reference to the "entities" array
                let entities = combat
                    .get_mut("entities")
                    .and_then(|e| e.as_array_mut())
                    .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "Failed to get entities array"))?;

                // Append the `iconid.json` to the entities array
                entities.push(Value::String(format!("{}.json", icon_id)));

                // Write the updated JSON content back to the file
                let updated_content = serde_json::to_string_pretty(&json_value)?;
                let mut file = OpenOptions::new()
                    .write(true)
                    .create(true)
                    .truncate(true)
                    .open(&chapter_path)?;

                file.write_all(updated_content.as_bytes())?;

                return Ok(());
            }
        }
    }

    // If no matching battlemap is found, return an error
    Err(io::Error::new(
        io::ErrorKind::NotFound,
        format!("Battlemap '{}' not found in the chapter '{}'", battlemap_id, chapter_id),
    ))
}

pub fn load_entity_from_file(entity_filename: &str) -> io::Result<Entity> {
    // Hardcoded base directory path
    let base_directory = Path::new("../tableau/entities");
    let entity_path = base_directory.join(entity_filename);

    // Check if the file exists
    if !entity_path.exists() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("Entity file '{}' not found.", entity_path.display()),
        ));
    }

    // Open the entity file
    let mut file = File::open(&entity_path)?;
    let mut content = String::new();
    file.read_to_string(&mut content)?;

    // Parse the JSON content into the Entity struct
    let entity: Entity = serde_json::from_str(&content).map_err(|e| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Failed to parse entity JSON: {}", e),
        )
    })?;

    Ok(entity)
}

/// Function to generate the center coordinates of a pointy-topped hexagonal grid
pub fn generate_grid_centers(
    container_width: u32,
    container_height: u32,
    size: f32,
    overflow: usize,
) -> Vec<Coordinates> {
    let hex_height = size * 2.0;
    let hex_width = (3.0_f32).sqrt() * size;
    let vertical_spacing = hex_height * 3.0 / 4.0;
    let horizontal_spacing = hex_width;

    let columns = ((container_width as f32 / horizontal_spacing).ceil() as usize) + overflow;
    let rows = ((container_height as f32 / vertical_spacing).ceil() as usize) + overflow;

    let mut centers = Vec::new();

    for row in -(overflow as i32)..rows as i32 {
        let cy = row as f32 * vertical_spacing;
        for col in -(overflow as i32)..columns as i32 {
            let mut cx = col as f32 * horizontal_spacing;
            if row % 2 != 0 {
                cx += horizontal_spacing / 2.0;
            }
            centers.push(Coordinates { x: cx, y: cy });
        }
    }
    centers
}

/// Calculate the hexagon vertices based on the center and size
pub fn calculate_hexagon_vertices(cx: f32, cy: f32, radius: f32) -> Vec<imageproc::point::Point<i32>> {
    let mut vertices = Vec::new();
    for i in 0..6 {
        let angle_deg = 60.0 * i as f32 + 30.0;
        let angle_rad = std::f32::consts::PI / 180.0 * angle_deg;
        let x = cx + radius * angle_rad.cos();
        let y = cy + radius * angle_rad.sin();
        vertices.push(imageproc::point::Point::new(x as i32, y as i32));
    }
    vertices
}

pub fn generate_hex_grid_png(
    grid_centers: &[Coordinates],
    size: f32,
    original_width: u32,
    original_height: u32,
    output_path: &str,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let mut image = image::RgbaImage::new(original_width, original_height);
    let line_color = image::Rgba([122, 122, 122, 255]); // Gray color for hexagon lines

    // Loop through each center and draw hexagon outlines without scaling
    for &center in grid_centers {
        // No scaling applied, use the original center coordinates
        let center_x = center.x;
        let center_y = center.y;

        // Keep the hexagon size the same as provided
        let hex_size = size;

        // Calculate hexagon vertices based on the original size and center
        let vertices = calculate_hexagon_vertices(center_x, center_y, hex_size);

        // Draw thicker lines by drawing small circles along the lines
        for i in 0..6 {
            let start = (vertices[i].x, vertices[i].y);  // Convert Point<i32> to tuple (i32, i32)
            let end = (vertices[(i + 1) % 6].x, vertices[(i + 1) % 6].y);  // Convert Point<i32> to tuple (i32, i32)

            // Draw a thick line (5px wide) by drawing small circles along the line
            draw_thick_line(&mut image, start, end, 2, line_color);
        }
    }

    // Save the image as PNG and map the error
    image.save(output_path).map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

    Ok(())
}

fn draw_thick_line(
    image: &mut image::RgbaImage,
    start: (i32, i32),
    end: (i32, i32),
    thickness: i32,
    color: image::Rgba<u8>,
) {
    // Calculate the number of steps to draw the circles along the line
    let num_steps = (((end.0 - start.0).pow(2) + (end.1 - start.1).pow(2)) as f32).sqrt() as i32;

    for step in 0..=num_steps {
        let t = step as f32 / num_steps as f32;
        let x = start.0 + (t * (end.0 - start.0) as f32).round() as i32;
        let y = start.1 + (t * (end.1 - start.1) as f32).round() as i32;

        // Draw a filled circle at each point along the line
        imageproc::drawing::draw_filled_circle_mut(image, (x, y), thickness / 2, color);
    }
}