import {
    BrandVueIcon,
    BrandDiscordIcon,
    BrandPythonIcon,
    BrandJavascriptIcon,
    BrandUbuntuIcon,
    ServerIcon,
    BrandReactIcon,
    BrandGithubIcon,
    DatabaseIcon,
    CodeIcon
} from 'vue-tabler-icons';

export const convertWithTechIcons = (techName) => {
    const lowerName = techName.toLowerCase();

    let icon = null;

    if (lowerName.includes('vue')) {
        icon = BrandVueIcon;
    } else if (lowerName.includes('discord')) {
        icon = BrandDiscordIcon;
    } else if (lowerName.includes('python')) {
        icon = BrandPythonIcon;
    } else if (lowerName.includes('javascript') || lowerName.includes('js')) {
        icon = BrandJavascriptIcon;
    } else if (lowerName.includes('linux') || lowerName.includes('ubuntu')) {
        icon = BrandUbuntuIcon;
    } else if (lowerName.includes('network') || lowerName.includes('server') || lowerName.includes('proxmox')) {
        icon = ServerIcon;
    } else if (lowerName.includes('react')) {
        icon = BrandReactIcon;
    } else if (lowerName.includes('github')) {
        icon = BrandGithubIcon;
    } else if (lowerName.includes('mongo') || lowerName.includes('db') || lowerName.includes('sql')) {
        icon = DatabaseIcon;
    } else {
        icon = CodeIcon; // Default icon
    }

    return {
        name: techName,
        icon: icon
    };
};
