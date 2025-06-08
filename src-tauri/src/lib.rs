mod utils;
mod models;

use std::fs;
use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path};

use serde_json::{Value, to_string_pretty};

use crate::models::{TransformStateObject};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    initialize_directory_structure().expect("Failed to initialize directory structure");

  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      create_chapter,
      remove_chapter,
      get_chapters,
      get_chapter_data,
      upload_landscapes,
      remove_landscape,
      upload_splashes,
      remove_splash,
      change_splash_allegiance,
      create_combat,
      remove_combat,
      update_battlemap_size,
      update_battlemap_xoffset,
      update_battlemap_yoffset,
      update_grid_size,
      update_grid_xoffset,
      update_grid_yoffset,
      upload_icon_image,
      add_entity,
      get_entities,
      update_entity,
      remove_entity,
      get_entity,
      generate_hexgrid
      ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn initialize_directory_structure() -> Result<(), std::io::Error> {
    // Create the base tableau directory
    let base_dir = Path::new("../tableau");
    create_directory_if_not_exists(base_dir)?;

    // Create subdirectories
    let directories = [
        "chapters",
        "assets",
        "assets/landscapes",
        "assets/splashes",
        "assets/battlemaps",
        "assets/entities",
        "assets/iconimages",
        "assets/hexgrids",
        "entities"
    ];

    for dir in directories.iter() {
        create_directory_if_not_exists(&base_dir.join(dir))?;
    }

    // Create entity IDs file if it doesn't exist
    let entity_ids_file = base_dir.join("entities").join("entity_ids.txt");
    if !entity_ids_file.exists() {
        File::create(entity_ids_file)?;
    }

    Ok(())
}

fn create_directory_if_not_exists(path: &Path) -> Result<(), std::io::Error> {
    if !path.exists() {
        fs::create_dir_all(path)?;
    }
    Ok(())
}

#[tauri::command]
fn create_chapter(chapter_id: String) -> Result<String, String> {
    // Format the chapter ID into the correct file path
    let path = utils::format_chapter_id(&chapter_id);

    // Check if the file already exists to avoid overwriting
    if path.exists() {
        return Err(format!("Chapter '{}' already exists.", chapter_id));
    }

    // Define the default chapter structure
    let chapter_data = serde_json::json!({
        "combat": [],
        "landscapes": [],
        "splashes": []
    });

    // Convert the chapter data into a pretty JSON string
    let chapter_json = match serde_json::to_string_pretty(&chapter_data) {
        Ok(json) => json,
        Err(err) => return Err(format!("Failed to serialize chapter data: {}", err)),
    };

    // Ensure the directory exists
    if let Some(parent) = path.parent() {
        if let Err(err) = std::fs::create_dir_all(parent) {
            return Err(format!("Failed to create directory: {}", err));
        }
    }

    // Write the JSON to the file
    let mut file = match std::fs::File::create(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to create chapter file: {}", err)),
    };

    if let Err(err) = file.write_all(chapter_json.as_bytes()) {
        return Err(format!("Failed to write chapter file: {}", err));
    }

    // Return success message
    Ok(format!("Chapter '{}' created successfully.", chapter_id))
}

#[tauri::command]
fn remove_chapter(chapter_id: String) -> Result<String, String> {
    // Convert the 'Chapter Id' format to 'chapter_id.json'
    let formatted_id = chapter_id.to_lowercase().replace(" ", "_");
    let file_path = format!("../tableau/chapters/{}.json", formatted_id);

    // Create a PathBuf from the file path
    let path = std::path::Path::new(&file_path);

    // Check if the file exists
    if !path.exists() {
        return Err(format!("Chapter file for '{}' not found.", chapter_id));
    }

    // Attempt to remove the file
    match std::fs::remove_file(path) {
        Ok(_) => Ok(format!("Chapter '{}' deleted successfully.", chapter_id)),
        Err(err) => Err(format!("Failed to delete chapter '{}': {}", chapter_id, err)),
    }
}



// Tauri command to get the list of chapters
#[tauri::command]
fn get_chapters() -> Result<Vec<String>, String> {
  // Specify the directory path
  let directory_path = "../tableau/chapters";

  // Fetch the list of files in the directory
  match utils::list_files_in_directory(directory_path) {
      Ok(files) => {
          // Extract and format the chapter names
          let chapters: Vec<String> = files
              .into_iter()
              .filter_map(|file| utils::extract_chapter_name(&file)) // Use extract_chapter_name to filter and format valid chapter names
              .collect();
          
          // Return the list of chapters
          Ok(chapters)
      }
      Err(err) => {
          // Return the error message if there's an issue reading the directory
          Err(format!("Failed to read directory: {}", err))
      }
  }
}

#[tauri::command]
fn get_chapter_data(chapter_id: String) -> Result<Value, String> {
    // Get the file path using format_chapter_id
    let path = utils::format_chapter_id(&chapter_id);

    // Check if the file exists
    if !path.exists() {
        return Err(format!("Chapter file for ID '{}' not found.", chapter_id));
    }

    // Open the file and read its contents
    let mut file = match File::open(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open file: {}", err)),
    };

    let mut content = String::new();
    if let Err(err) = file.read_to_string(&mut content) {
        return Err(format!("Failed to read file: {}", err));
    }

    // Parse the JSON data
    match serde_json::from_str(&content) {
        Ok(json_value) => Ok(json_value),
        Err(err) => Err(format!("Failed to parse JSON: {}", err)),
    }
}

// Tauri command to upload landscapes
#[tauri::command]
fn upload_landscapes(chapter_id: String) -> Result<String, String> {

    match utils::select_image_files() {
        Some(paths) => {
            let mut landscapes: Vec<String> = Vec::new();
            let landscapes_directory = "../tableau/assets/landscapes";

            // Loop through the selected files
            for path in paths {
                // Save the image to the specified directory
                if let Err(e) = utils::save_image_to_directory(&path, Path::new(landscapes_directory)) {
                    return Err(format!("Failed to save image: {}", e));
                }

                // Get the image filename and push it to the landscapes vector
                match utils::get_image_filename(&path) {
                    Some(filename) => landscapes.push(filename),
                    None => return Err("Failed to extract image filename".to_string()),
                }
            }

            // Update the landscapes in the JSON for the specified chapter
            if let Err(e) = utils::update_landscapes(chapter_id, landscapes) {
                return Err(format!("Failed to update landscapes: {}", e));
            }

            // If everything is successful, return a success message
            Ok("Landscapes uploaded and updated successfully.".to_string())
        }
        None => {
            // No files were selected
            Err("No images were selected.".to_string())
        }
    }
}

#[tauri::command]
fn remove_landscape(chapter_id: String, filename: String) -> Result<String, String> {
    // Get the file path using format_chapter_id
    let path = utils::format_chapter_id(&chapter_id);

    // Check if the file exists
    if !path.exists() {
        return Err(format!("Chapter file for ID '{}' not found.", chapter_id));
    }

    // Open the file and read its contents
    let mut file = match File::open(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open file: {}", err)),
    };

    let mut content = String::new();
    if let Err(err) = file.read_to_string(&mut content) {
        return Err(format!("Failed to read file: {}", err));
    }

    // Parse the JSON data
    let mut json_value: Value = match serde_json::from_str(&content) {
        Ok(json_value) => json_value,
        Err(err) => return Err(format!("Failed to parse JSON: {}", err)),
    };

    // Get the landscapes array and remove the filename if it exists
    if let Some(landscapes) = json_value.get_mut("landscapes") {
        if landscapes.is_array() {
            let landscapes_array = landscapes.as_array_mut().unwrap();
            
            // Find and remove the filename from the array
            landscapes_array.retain(|landscape| landscape != &Value::String(filename.clone()));
        } else {
            return Err("The landscapes field is not an array.".to_string());
        }
    } else {
        return Err("The JSON file does not contain a landscapes field.".to_string());
    }

    // Open the file for writing and write the updated JSON data
    let mut file = match File::create(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open file for writing: {}", err)),
    };

    let updated_content = match serde_json::to_string_pretty(&json_value) {
        Ok(content) => content,
        Err(err) => return Err(format!("Failed to serialize updated JSON: {}", err)),
    };

    if let Err(err) = file.write_all(updated_content.as_bytes()) {
        return Err(format!("Failed to write updated file: {}", err));
    }

    Ok(format!("Successfully removed '{}' from the landscapes array.", filename))
}

// Tauri command to upload splashes
#[tauri::command]
fn upload_splashes(chapter_id: String) -> Result<String, String> {

    match utils::select_image_files() {
        Some(paths) => {
            let mut splashes: Vec<String> = Vec::new();
            let splashes_directory = "../tableau/assets/splashes";

            // Loop through the selected files
            for path in paths {
                // Save the image to the specified directory
                if let Err(e) = utils::save_image_to_directory(&path, Path::new(splashes_directory)) {
                    return Err(format!("Failed to save image: {}", e));
                }

                // Get the image filename and push it to the splashes vector
                match utils::get_image_filename(&path) {
                    Some(filename) => splashes.push(filename),
                    None => return Err("Failed to extract image filename".to_string()),
                }
            }

            // Update the splashes in the JSON for the specified chapter
            if let Err(e) = utils::update_splashes(chapter_id, splashes) {
                return Err(format!("Failed to update splashes: {}", e));
            }

            // If everything is successful, return a success message
            Ok("Splashes uploaded and updated successfully.".to_string())
        }
        None => {
            // No files were selected
            Err("No images were selected.".to_string())
        }
    }
}

#[tauri::command]
fn remove_splash(chapter_id: String, filename: String) -> Result<String, String> {
    // Get the file path using format_chapter_id
    let path = utils::format_chapter_id(&chapter_id);

    // Check if the file exists
    if !path.exists() {
        return Err(format!("Chapter file for ID '{}' not found.", chapter_id));
    }

    // Open the file and read its contents
    let mut file = match File::open(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open file: {}", err)),
    };

    let mut content = String::new();
    if let Err(err) = file.read_to_string(&mut content) {
        return Err(format!("Failed to read file: {}", err));
    }

    // Parse the JSON data
    let mut json_value: Value = match serde_json::from_str(&content) {
        Ok(json_value) => json_value,
        Err(err) => return Err(format!("Failed to parse JSON: {}", err)),
    };

    // Get the splashes array and remove the splash with the matching filename
    if let Some(splashes) = json_value.get_mut("splashes") {
        if let Some(array) = splashes.as_array_mut() {
            // Find and remove the object with the matching 'image' field
            array.retain(|splash| {
                if let Some(image) = splash.get("image").and_then(|img| img.as_str()) {
                    image != filename  // Retain items where the image doesn't match the filename
                } else {
                    true  // If no image field, retain it (shouldn't happen with valid data)
                }
            });
        } else {
            return Err("The splashes field is not an array.".to_string());
        }
    } else {
        return Err("The JSON file does not contain a splashes field.".to_string());
    }

    // Open the file for writing and write the updated JSON data
    let mut file = match File::create(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open file for writing: {}", err)),
    };

    let updated_content = match serde_json::to_string_pretty(&json_value) {
        Ok(content) => content,
        Err(err) => return Err(format!("Failed to serialize updated JSON: {}", err)),
    };

    if let Err(err) = file.write_all(updated_content.as_bytes()) {
        return Err(format!("Failed to write updated file: {}", err));
    }

    Ok(format!("Successfully removed splash with image '{}' from the splashes array.", filename))
}

#[tauri::command]
fn change_splash_allegiance(chapter_id: String, filename: String) -> Result<String, String> {
    // Get the file path using format_chapter_id
    let path = utils::format_chapter_id(&chapter_id);

    // Check if the file exists
    if !path.exists() {
        return Err(format!("Chapter file for ID '{}' not found.", chapter_id));
    }

    // Open the file and read its contents
    let mut file = match File::open(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open file: {}", err)),
    };

    let mut content = String::new();
    if let Err(err) = file.read_to_string(&mut content) {
        return Err(format!("Failed to read file: {}", err));
    }

    // Parse the JSON data
    let mut json_value: Value = match serde_json::from_str(&content) {
        Ok(json_value) => json_value,
        Err(err) => return Err(format!("Failed to parse JSON: {}", err)),
    };

    // Get the splashes array and find the splash object with the matching filename
    if let Some(splashes) = json_value.get_mut("splashes") {
        if let Some(array) = splashes.as_array_mut() {
            for splash in array.iter_mut() {
                // Check if the splash object has the matching 'image' field
                if let Some(image) = splash.get("image").and_then(|img| img.as_str()) {
                    if image == filename {
                        // Found the splash object, now toggle the allegiance
                        if let Some(allegiance) = splash.get_mut("allegiance") {
                            if allegiance == "neutral" {
                                *allegiance = Value::String("evil".to_string());
                            } else if allegiance == "evil" {
                                *allegiance = Value::String("neutral".to_string());
                            }
                        } else {
                            // If no 'allegiance' field exists, default it to 'neutral'
                            splash["allegiance"] = Value::String("neutral".to_string());
                        }
                    }
                }
            }
        } else {
            return Err("The splashes field is not an array.".to_string());
        }
    } else {
        return Err("The JSON file does not contain a splashes field.".to_string());
    }

    // Open the file for writing and write the updated JSON data
    let mut file = match File::create(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open file for writing: {}", err)),
    };

    let updated_content = match serde_json::to_string_pretty(&json_value) {
        Ok(content) => content,
        Err(err) => return Err(format!("Failed to serialize updated JSON: {}", err)),
    };

    if let Err(err) = file.write_all(updated_content.as_bytes()) {
        return Err(format!("Failed to write updated file: {}", err));
    }

    Ok(format!("Successfully updated the allegiance for splash '{}'.", filename))
}

#[tauri::command]
fn create_combat(chapter_id: String) -> Result<String, String> {

    match utils::select_image_file() { 
        Some(path) => { 
            let battlemaps_directory = "../tableau/assets/battlemaps";
            let battlemap: String;

            // Save the image to the specified directory
            if let Err(e) = utils::save_image_to_directory(&path, Path::new(battlemaps_directory)) {
                return Err(format!("Failed to save image: {}", e));
            }

            // Get the image filename
            match utils::get_image_filename(&path) {
                Some(filename) => battlemap = filename,
                None => return Err("Failed to extract image filename".to_string()),
            }

            // Update the battlemap in the JSON for the specified chapter
            if let Err(e) = utils::update_combat(chapter_id, battlemap) {
                return Err(format!("Failed to update combat: {}", e));
            }

            // If everything is successful, return a success message
            Ok("Combat created successfully.".to_string())
        }
        None => {
            // No file was selected
            Err("No image was selected.".to_string())
        }
    }
}

#[tauri::command]
fn remove_combat(chapter_id: String, battlemap: String) -> Result<String, String> {
    // Get the file path using format_chapter_id
    let path = utils::format_chapter_id(&chapter_id);

    // Check if the file exists
    if !path.exists() {
        return Err(format!("Chapter file for ID '{}' not found.", chapter_id));
    }

    // Open the file and read its contents
    let mut file = match File::open(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open file: {}", err)),
    };

    let mut content = String::new();
    if let Err(err) = file.read_to_string(&mut content) {
        return Err(format!("Failed to read file: {}", err));
    }

    // Parse the JSON data
    let mut json_value: Value = match serde_json::from_str(&content) {
        Ok(json_value) => json_value,
        Err(err) => return Err(format!("Failed to parse JSON: {}", err)),
    };

    // Get the combat array and remove the object with the matching battlemap
    if let Some(combat_array) = json_value.get_mut("combat") {
        if combat_array.is_array() {
            let array = combat_array.as_array_mut().unwrap();
            array.retain(|combat| combat["battlemap"] != battlemap);
        } else {
            return Err("The 'combat' field is not an array.".to_string());
        }
    } else {
        return Err("The JSON file does not contain a 'combat' field.".to_string());
    }

    // Open the file for writing and write the updated JSON data
    let mut file = match File::create(&path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open file for writing: {}", err)),
    };

    let updated_content = match serde_json::to_string_pretty(&json_value) {
        Ok(content) => content,
        Err(err) => return Err(format!("Failed to serialize updated JSON: {}", err)),
    };

    if let Err(err) = file.write_all(updated_content.as_bytes()) {
        return Err(format!("Failed to write updated file: {}", err));
    }

    Ok(format!("Successfully removed combat with battlemap '{}'.", battlemap))
}

#[tauri::command]
fn update_battlemap_size(chapter_id: String, battlemap: String, size: u32) -> Result<(), String> {
    // Get the path of the chapter JSON file
    let chapter_path = utils::format_chapter_id(&chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut file = File::open(&chapter_path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;

    // Parse the content into a `Value`
    let mut json_value: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Find the matching battlemap object in the `combat` array and update the size
    let combat_array = json_value.get_mut("combat").unwrap().as_array_mut().unwrap();
    for combat in combat_array.iter_mut() {
        if combat.get("battlemap").unwrap().as_str().unwrap() == battlemap {
            // Update the `mapsize` field
            combat["mapsize"] = Value::Number(serde_json::Number::from(size));
            break;
        }
    }

    // Write the updated JSON content back to the file
    let updated_content = serde_json::to_string_pretty(&json_value).map_err(|e| e.to_string())?;
    let mut file = File::create(&chapter_path).map_err(|e| e.to_string())?;
    file.write_all(updated_content.as_bytes()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_battlemap_xoffset(chapter_id: String, battlemap: String, xoffset: i32) -> Result<(), String> {
    // Get the path of the chapter JSON file
    let chapter_path = utils::format_chapter_id(&chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut file = File::open(&chapter_path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;

    // Parse the content into a `Value`
    let mut json_value: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Find the matching battlemap object in the `combat` array and update the x offset
    let combat_array = json_value.get_mut("combat").unwrap().as_array_mut().unwrap();
    for combat in combat_array.iter_mut() {
        if combat.get("battlemap").unwrap().as_str().unwrap() == battlemap {
            // Update the `mapoffset.x` field
            combat["mapoffset"]["x"] = Value::Number(serde_json::Number::from(xoffset));
            break;
        }
    }

    // Write the updated JSON content back to the file
    let updated_content = serde_json::to_string_pretty(&json_value).map_err(|e| e.to_string())?;
    let mut file = File::create(&chapter_path).map_err(|e| e.to_string())?;
    file.write_all(updated_content.as_bytes()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_battlemap_yoffset(chapter_id: String, battlemap: String, yoffset: i32) -> Result<(), String> {
    // Get the path of the chapter JSON file
    let chapter_path = utils::format_chapter_id(&chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut file = File::open(&chapter_path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;

    // Parse the content into a `Value`
    let mut json_value: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Find the matching battlemap object in the `combat` array and update the y offset
    let combat_array = json_value.get_mut("combat").unwrap().as_array_mut().unwrap();
    for combat in combat_array.iter_mut() {
        if combat.get("battlemap").unwrap().as_str().unwrap() == battlemap {
            // Update the `mapoffset.y` field
            combat["mapoffset"]["y"] = Value::Number(serde_json::Number::from(yoffset));
            break;
        }
    }

    // Write the updated JSON content back to the file
    let updated_content = serde_json::to_string_pretty(&json_value).map_err(|e| e.to_string())?;
    let mut file = File::create(&chapter_path).map_err(|e| e.to_string())?;
    file.write_all(updated_content.as_bytes()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_grid_size(chapter_id: String, battlemap: String, size: u32) -> Result<(), String> {
    // Get the path of the chapter JSON file
    let chapter_path = utils::format_chapter_id(&chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut file = File::open(&chapter_path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;

    // Parse the content into a `Value`
    let mut json_value: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Find the matching battlemap object in the `combat` array and update the gridsize
    let combat_array = json_value.get_mut("combat").unwrap().as_array_mut().unwrap();
    for combat in combat_array.iter_mut() {
        if combat.get("battlemap").unwrap().as_str().unwrap() == battlemap {
            // Update the `gridsize` field
            combat["gridsize"] = Value::Number(serde_json::Number::from(size));
            break;
        }
    }

    // Write the updated JSON content back to the file
    let updated_content = serde_json::to_string_pretty(&json_value).map_err(|e| e.to_string())?;
    let mut file = File::create(&chapter_path).map_err(|e| e.to_string())?;
    file.write_all(updated_content.as_bytes()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_grid_xoffset(chapter_id: String, battlemap: String, xoffset: i32) -> Result<(), String> {
    // Get the path of the chapter JSON file
    let chapter_path = utils::format_chapter_id(&chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut file = File::open(&chapter_path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;

    // Parse the content into a `Value`
    let mut json_value: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Find the matching battlemap object in the `combat` array and update the grid x offset
    let combat_array = json_value.get_mut("combat").unwrap().as_array_mut().unwrap();
    for combat in combat_array.iter_mut() {
        if combat.get("battlemap").unwrap().as_str().unwrap() == battlemap {
            // Update the `gridoffset.x` field
            combat["gridoffset"]["x"] = Value::Number(serde_json::Number::from(xoffset));
            break;
        }
    }

    // Write the updated JSON content back to the file
    let updated_content = serde_json::to_string_pretty(&json_value).map_err(|e| e.to_string())?;
    let mut file = File::create(&chapter_path).map_err(|e| e.to_string())?;
    file.write_all(updated_content.as_bytes()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_grid_yoffset(chapter_id: String, battlemap: String, yoffset: i32) -> Result<(), String> {
    // Get the path of the chapter JSON file
    let chapter_path = utils::format_chapter_id(&chapter_id);

    // Read existing JSON content into a `serde_json::Value`
    let mut file = File::open(&chapter_path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;

    // Parse the content into a `Value`
    let mut json_value: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Find the matching battlemap object in the `combat` array and update the grid y offset
    let combat_array = json_value.get_mut("combat").unwrap().as_array_mut().unwrap();
    for combat in combat_array.iter_mut() {
        if combat.get("battlemap").unwrap().as_str().unwrap() == battlemap {
            // Update the `gridoffset.y` field
            combat["gridoffset"]["y"] = Value::Number(serde_json::Number::from(yoffset));
            break;
        }
    }

    // Write the updated JSON content back to the file
    let updated_content = serde_json::to_string_pretty(&json_value).map_err(|e| e.to_string())?;
    let mut file = File::create(&chapter_path).map_err(|e| e.to_string())?;
    file.write_all(updated_content.as_bytes()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn upload_icon_image() -> Result<String, String> {
    // Open a file dialog to select an image file
    match utils::select_image_file() {
        Some(path) => {
            let icon_images_directory = "../tableau/assets/iconimages";

            // Save the image to the specified directory
            if let Err(e) = utils::save_image_to_directory(&path, Path::new(icon_images_directory)) {
                return Err(format!("Failed to save image: {}", e));
            }

            // Convert the path to a filename and return it
            match utils::get_image_filename(&path) {
                Some(filename) => Ok(filename),
                None => Err("Failed to extract image filename.".to_string()),
            }
        }
        None => Err("No image file was selected.".to_string()),
    }
}

#[tauri::command]
fn add_entity(
    chapter_id: String,
    battlemap_id: String,
    image_filename: String,
    allegiance: String,
    entity_size: String,
    transform_state: TransformStateObject,
) -> Result<String, String> {
    // Step 1: Generate a unique icon ID
    let icon_id = match utils::generate_icon_id() {
        Ok(id) => id,
        Err(err) => return Err(format!("Failed to generate icon ID: {}", err)),
    };

    // Step 2: Generate the entity icon
    if let Err(err) = utils::generate_entity_icon(&image_filename, transform_state, &icon_id, &allegiance) {
        return Err(format!("Failed to generate entity icon: {}", err));
    }

    // Step 3: Create the entity JSON file
    if let Err(err) = utils::create_entity(&icon_id, &allegiance, &entity_size) {
        return Err(format!("Failed to create entity: {}", err));
    }

    // Step 4: Update the entities in the chapter JSON
    if let Err(err) = utils::update_entities(&chapter_id, &battlemap_id, &icon_id) {
        return Err(format!("Failed to update entities: {}", err));
    }

    // If all steps succeed, return success message
    Ok(format!("Entity '{}' added successfully.", icon_id))
}

#[tauri::command]
fn get_entities(
    chapter_id: String,
    battlemap_id: String,
) -> Result<Vec<models::Entity>, String> {
    // Step 1: Locate the chapter file
    let chapter_path = utils::format_chapter_id(&chapter_id);

    if !chapter_path.exists() {
        return Err(format!("Chapter file for '{}' not found.", chapter_id));
    }

    // Step 2: Read the chapter data
    let mut file = File::open(&chapter_path).map_err(|e| format!("Failed to open chapter file: {}", e))?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| format!("Failed to read chapter file: {}", e))?;

    // Step 3: Parse the chapter JSON
    let json_value: Value = serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Step 4: Find the combat object matching the battlemap_id
    let combat_array = json_value
        .get("combat")
        .and_then(|c| c.as_array())
        .ok_or_else(|| "Combat array not found in the chapter file.".to_string())?;

    let combat = combat_array
        .iter()
        .find(|c| c.get("battlemap").and_then(|b| b.as_str()) == Some(&battlemap_id))
        .ok_or_else(|| format!("Battlemap '{}' not found in the chapter '{}'", battlemap_id, chapter_id))?;

    // Step 5: Get the entities array from the combat object
    let entities_array = combat
        .get("entities")
        .and_then(|e| e.as_array())
        .ok_or_else(|| "Entities array not found in the combat object.".to_string())?;

    // Step 6: Load each entity.json file using load_entity_from_file and collect the data
    let mut entities_data = Vec::new();
    for entity_file in entities_array {
        if let Some(entity_filename) = entity_file.as_str() {
            // Use the load_entity_from_file function to get the entity data
            match utils::load_entity_from_file(entity_filename) {
                Ok(entity) => entities_data.push(entity),
                Err(err) => return Err(format!("Failed to load entity '{}': {}", entity_filename, err)),
            }
        }
    }

    // Step 7: Return the array of entity data to the front end
    Ok(entities_data)
}

#[tauri::command]
fn update_entity(entity: models::Entity) -> Result<(), String> {
    // Extract the ID from the entity's icon filename, assuming it ends with `.png`.
    let icon_filename = entity.icon.trim();
    if !icon_filename.ends_with(".png") {
        return Err("Invalid icon format. Expected format: 'id.png'".to_string());
    }
    let id = &icon_filename[..icon_filename.len() - 4]; // Remove the `.png` extension.

    // Define the path to the entity file (`../tableau/entities/id.json`).
    let entity_file_path = Path::new("../tableau/entities").join(format!("{}.json", id));

    // Serialize the Entity struct to a JSON string.
    let serialized_entity = to_string_pretty(&entity).map_err(|e| {
        format!("Failed to serialize entity: {}", e)
    })?;

    // Open the file in write mode and write the serialized JSON.
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true) // Clear the file before writing the new content.
        .open(&entity_file_path)
        .map_err(|e| format!("Failed to open file '{}': {}", entity_file_path.display(), e))?;

    file.write_all(serialized_entity.as_bytes()).map_err(|e| {
        format!("Failed to write to file '{}': {}", entity_file_path.display(), e)
    })?;

    Ok(())
}

#[tauri::command]
fn remove_entity(chapter_id: String, battlemap_id: String, icon_id: String) -> Result<(), String> {
    // Step 1: Remove the associated PNG file in the assets directory
    let png_path = format!("../tableau/assets/entities/{}", icon_id);
    if let Err(err) = std::fs::remove_file(&png_path) {
        return Err(format!("Failed to delete PNG file '{}': {}", png_path, err));
    }

    // Step 2: Remove the associated JSON file in the entities directory
    let json_filename = icon_id.replace(".png", ".json");
    let json_path = format!("../tableau/entities/{}", json_filename);
    if let Err(err) = std::fs::remove_file(&json_path) {
        return Err(format!("Failed to delete JSON file '{}': {}", json_path, err));
    }

    // Step 3: Remove the icon from the entities array in the specified combat object
    let chapter_path = utils::format_chapter_id(&chapter_id);

    // Read the existing chapter file
    let mut file = std::fs::File::open(&chapter_path).map_err(|e| format!("Failed to open chapter file: {}", e))?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| format!("Failed to read chapter file: {}", e))?;

    // Parse the chapter JSON
    let mut json_value: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Locate the specified battlemap's combat object
    let combat_array = json_value
        .get_mut("combat")
        .and_then(|c| c.as_array_mut())
        .ok_or_else(|| "Combat array not found in the chapter file.".to_string())?;

    let combat = combat_array
        .iter_mut()
        .find(|c| c.get("battlemap").and_then(|b| b.as_str()) == Some(&battlemap_id))
        .ok_or_else(|| format!("Battlemap '{}' not found in the chapter '{}'", battlemap_id, chapter_id))?;

    // Find and remove the entity from the entities array
    if let Some(entities_array) = combat.get_mut("entities").and_then(|e| e.as_array_mut()) {
        entities_array.retain(|e| e.as_str() != Some(&json_filename));
    }

    // Write the updated JSON content back to the file
    let updated_content = serde_json::to_string_pretty(&json_value).map_err(|e| format!("Failed to serialize updated JSON: {}", e))?;
    let mut file = std::fs::File::create(&chapter_path).map_err(|e| format!("Failed to open chapter file for writing: {}", e))?;
    file.write_all(updated_content.as_bytes()).map_err(|e| format!("Failed to write updated chapter file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn get_entity(entity_filename: String) -> Result<Value, String> {
    // Define the path to the entity file in the entities directory
    let entity_path = Path::new("../tableau/entities").join(&entity_filename);

    // Check if the file exists
    if !entity_path.exists() {
        return Err(format!("Entity file '{}' not found.", entity_filename));
    }

    // Open and read the file
    let mut file = match File::open(&entity_path) {
        Ok(f) => f,
        Err(e) => return Err(format!("Failed to open entity file '{}': {}", entity_filename, e)),
    };

    let mut content = String::new();
    if let Err(e) = file.read_to_string(&mut content) {
        return Err(format!("Failed to read entity file '{}': {}", entity_filename, e));
    }

    // Parse the content into JSON
    match serde_json::from_str(&content) {
        Ok(json_value) => Ok(json_value),
        Err(e) => Err(format!("Failed to parse entity JSON in file '{}': {}", entity_filename, e)),
    }
}


#[tauri::command]
fn generate_hexgrid(
    container_width: u32,
    container_height: u32,
    hex_size: f32,
    overflow: usize,
    output_path: String,
) -> Result<String, String> {
    // Create metadata filename alongside the PNG
    let metadata_path = format!("{}.meta", output_path);
    
    // Check if both files exist and parameters match
    if Path::new(&output_path).exists() && Path::new(&metadata_path).exists() {
        // Read existing metadata
        if let Ok(metadata_content) = std::fs::read_to_string(&metadata_path) {
            if let Ok(metadata) = serde_json::from_str::<serde_json::Value>(&metadata_content) {
                // Check if parameters match
                if metadata["container_width"] == container_width &&
                   metadata["container_height"] == container_height &&
                   metadata["hex_size"] == hex_size &&
                   metadata["overflow"] == overflow {
                    return Ok(format!("Hex grid already exists with current parameters at '{}'.", output_path));
                }
            }
        }
    }

    // Generate grid centers
    let grid_centers = utils::generate_grid_centers(container_width, container_height, hex_size, overflow);

    // Generate the PNG
    match utils::generate_hex_grid_png(&grid_centers, hex_size, container_width, container_height, &output_path) {
        Ok(_) => {
            // Save metadata for future parameter comparison
            let metadata = serde_json::json!({
                "container_width": container_width,
                "container_height": container_height,
                "hex_size": hex_size,
                "overflow": overflow
            });
            
            if let Err(e) = std::fs::write(&metadata_path, metadata.to_string()) {
                eprintln!("Warning: Failed to save hexgrid metadata: {}", e);
            }
            
            Ok(format!("Hex grid PNG generated at '{}'.", output_path))
        },
        Err(e) => Err(format!("Failed to generate hex grid PNG: {}", e)),
    }
}