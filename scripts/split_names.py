#!/usr/bin/env python3
import csv
import os

def split_name(name):
    """
    Split a name into first_name and last_name based on spaces.
    If no space, put everything in first_name and leave last_name empty.
    If multiple spaces, first word is first_name, rest is last_name.
    """
    if not name or name.strip() == "":
        return "", ""
    
    name = name.strip()
    parts = name.split(' ', 1)  # Split on first space only
    
    if len(parts) == 1:
        # No space found, entire name goes to first_name
        return parts[0], ""
    else:
        # Space found, split into first_name and last_name
        return parts[0], parts[1]

def process_csv():
    input_file = "db/universe.users.trimmed.csv"
    output_file = "db/universe.users.trimmed.modified.csv"
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found!")
        return
    
    # Read the original CSV
    with open(input_file, 'r', encoding='utf-8', newline='') as infile:
        reader = csv.reader(infile)
        
        # Read header
        header = next(reader)
        print(f"Original header: {header}")
        
        # Find the name column index
        name_index = None
        for i, col in enumerate(header):
            if col.lower() == 'name':
                name_index = i
                break
        
        if name_index is None:
            print("Error: 'name' column not found!")
            return
        
        print(f"Name column found at index: {name_index}")
        
        # Create new header with first_name and last_name replacing name
        new_header = header.copy()
        new_header[name_index] = 'first_name'
        new_header.insert(name_index + 1, 'last_name')
        
        print(f"New header: {new_header}")
        
        # Process all rows
        rows = []
        processed_count = 0
        
        for row in reader:
            if len(row) <= name_index:
                # Skip rows that don't have enough columns
                continue
                
            # Get the name and split it
            name = row[name_index] if name_index < len(row) else ""
            first_name, last_name = split_name(name)
            
            # Create new row with split names
            new_row = row.copy()
            new_row[name_index] = first_name
            new_row.insert(name_index + 1, last_name)
            
            rows.append(new_row)
            processed_count += 1
            
            # Print some examples
            if processed_count <= 10:
                print(f"Example {processed_count}: '{name}' -> first: '{first_name}', last: '{last_name}'")
    
    # Write the modified CSV
    with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile)
        
        # Write header
        writer.writerow(new_header)
        
        # Write all rows
        writer.writerows(rows)
    
    print(f"\nProcessing complete!")
    print(f"Processed {processed_count} rows")
    print(f"Output saved to: {output_file}")

if __name__ == "__main__":
    process_csv() 