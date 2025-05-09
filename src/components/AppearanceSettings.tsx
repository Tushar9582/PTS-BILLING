
import React from "react";
import { Moon, Sun, Settings } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

const AppearanceSettings = () => {
  const { theme, setTheme, buttonStyle, setButtonStyle } = useTheme();

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast.success(`Theme switched to ${newTheme} mode`);
  };

  const handleButtonStyleChange = (style: string) => {
    setButtonStyle(style);
    toast.success(`Button style updated to ${style}`);
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Appearance Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Theme</h3>
          <div className="flex items-center gap-4">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="flex items-center gap-2"
              onClick={() => handleThemeChange("light")}
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="flex items-center gap-2"
              onClick={() => handleThemeChange("dark")}
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              className="flex items-center gap-2"
              onClick={() => handleThemeChange("system")}
            >
              System
            </Button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">Button Style</h3>
          <RadioGroup 
            value={buttonStyle} 
            onValueChange={handleButtonStyleChange}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="default" id="default" />
              <Label htmlFor="default" className="flex items-center gap-2">
                <Button size="sm" variant="default" className="pointer-events-none">Default</Button>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="neon" id="neon" />
              <Label htmlFor="neon" className="flex items-center gap-2">
                <Button size="sm" variant="neon" className="pointer-events-none">Neon</Button>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="neumorphic" id="neumorphic" />
              <Label htmlFor="neumorphic" className="flex items-center gap-2">
                <Button size="sm" variant="neumorphic" className="pointer-events-none">Neumorphic</Button>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppearanceSettings;
