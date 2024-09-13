import re

def sentence_case(text):
    if text:
        return text[0].upper() + text[1:].lower()
    return text

def format_tvg_unique_name(tvg_name):
    return tvg_name.lower().replace(' ', '-')

def process_m3u_file(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as file:
        lines = file.readlines()

    processed_lines = []
    for line in lines:
        if line.startswith("#EXTINF"):
            # Extract the tvg-name and group-title
            tvg_name_match = re.search(r'tvg-name="([^"]+)"', line)
            group_title_match = re.search(r'group-title="([^"]+)"', line)
            
            if tvg_name_match:
                tvg_name = tvg_name_match.group(1)
                sentence_cased_tvg_name = sentence_case(tvg_name)

                # Add tvg-unique_name derived from tvg-name
                tvg_unique_name = format_tvg_unique_name(tvg_name)
                tvg_unique_name_str = f'tvg-unique_name="{tvg_unique_name}"'

                # Replace tvg-name with sentence-cased version
                line = re.sub(r'tvg-name="[^"]+"', f'tvg-name="{sentence_cased_tvg_name}"', line)

            if group_title_match:
                group_title = group_title_match.group(1)
                sentence_cased_group_title = sentence_case(group_title)

                # Replace group-title with sentence-cased version
                line = re.sub(r'group-title="[^"]+"', f'group-title="{sentence_cased_group_title}"', line)

                # Insert tvg-unique_name before group-title
                line = line.replace(f'group-title="{sentence_cased_group_title}"', f'{tvg_unique_name_str}, group-title="{sentence_cased_group_title}"')

        processed_lines.append(line)

    with open(output_file, 'w', encoding='utf-8') as file:
        file.writelines(processed_lines)

# Example usage
input_file = 'Website.m3u'
output_file = 'output.m3u'
process_m3u_file(input_file, output_file)
