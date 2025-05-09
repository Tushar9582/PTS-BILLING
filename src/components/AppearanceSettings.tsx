
import React from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Palette } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const AppearanceSettings = () => {
  const { theme, setTheme, buttonStyle, setButtonStyle } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Theme</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <Button 
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4" />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4" />
            Dark
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setTheme("system")}
          >
            <Palette className="h-4 w-4" />
            System
          </Button>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Button Style</h3>
        <RadioGroup 
          value={buttonStyle} 
          onValueChange={(value) => setButtonStyle(value as "default" | "neon" | "neumorphic")}
          className="flex flex-col space-y-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="default" id="default" />
            <Label htmlFor="default">Default</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="neon" id="neon" />
            <Label htmlFor="neon">Neon</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="neumorphic" id="neumorphic" />
            <Label htmlFor="neumorphic">Neumorphic</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default AppearanceSettings;
