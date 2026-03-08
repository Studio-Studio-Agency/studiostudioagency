import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, CheckCircle, Loader2 } from "lucide-react";

const SurveyPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Survey responses
  const [howFound, setHowFound] = useState("");
  const [frequency, setFrequency] = useState("");
  const [mostUseful, setMostUseful] = useState("");
  const [improvements, setImprovements] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const surveyData = {
      "Wie haben Sie von der App erfahren?": howFound,
      "Wie oft nutzen Sie die App?": frequency,
      "Was ist am nützlichsten?": mostUseful,
      "Verbesserungsvorschläge": improvements,
      "Weiterempfehlung (1-10)": recommendation,
      "Weitere Kommentare": additionalComments
    };

    const { error } = await supabase.from("survey_responses").insert({
      user_id: user.id,
      antwort: JSON.stringify(surveyData, null, 2)
    });

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Umfrage gesendet!", description: "Vielen Dank für Ihr Feedback!" });
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-6 max-w-2xl">
          <button onClick={() => navigate("/listen")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </button>
          
          <Card className="text-center py-8">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Vielen Dank!</h2>
              <p className="text-muted-foreground">
                Ihre Antworten helfen uns dabei, die App kontinuierlich zu verbessern.
              </p>
              <Button onClick={() => navigate("/listen")} className="mt-4">
                Zurück zu den Listen
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 max-w-2xl">
        <button onClick={() => navigate("/listen")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Nutzer-Umfrage</CardTitle>
            <CardDescription>
              Helfen Sie uns, die App zu verbessern! Ihre Antworten sind anonym und dauern nur 2-3 Minuten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Wie erfahren */}
              <div>
                <Label className="text-base font-medium">Wie haben Sie von der App erfahren?</Label>
                <RadioGroup value={howFound} onValueChange={setHowFound} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="google" id="google" />
                    <Label htmlFor="google">Google Suche</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="freunde" id="freunde" />
                    <Label htmlFor="freunde">Freunde/Familie</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="social" id="social" />
                    <Label htmlFor="social">Social Media</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="store" id="store" />
                    <Label htmlFor="store">App Store</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="andere" id="andere" />
                    <Label htmlFor="andere">Andere</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Nutzungshäufigkeit */}
              <div>
                <Label className="text-base font-medium">Wie oft nutzen Sie die App?</Label>
                <RadioGroup value={frequency} onValueChange={setFrequency} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="täglich" id="täglich" />
                    <Label htmlFor="täglich">Täglich</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wöchentlich" id="wöchentlich" />
                    <Label htmlFor="wöchentlich">Mehrmals pro Woche</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gelegentlich" id="gelegentlich" />
                    <Label htmlFor="gelegentlich">Gelegentlich</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selten" id="selten" />
                    <Label htmlFor="selten">Selten</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Nützlichste Feature */}
              <div>
                <Label className="text-base font-medium">Was finden Sie am nützlichsten?</Label>
                <RadioGroup value={mostUseful} onValueChange={setMostUseful} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="checkboxes" id="checkboxes" />
                    <Label htmlFor="checkboxes">Checkboxen zum Abhaken</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ki-analyse" id="ki-analyse" />
                    <Label htmlFor="ki-analyse">KI-Analyse von Lebensmitteln</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="kalender" id="kalender" />
                    <Label htmlFor="kalender">Kalender-Integration</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="einfachheit" id="einfachheit" />
                    <Label htmlFor="einfachheit">Einfache Bedienung</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Verbesserungen */}
              <div>
                <Label htmlFor="improvements" className="text-base font-medium">Was könnte verbessert werden?</Label>
                <Textarea
                  id="improvements"
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="Ihre Vorschläge..."
                  className="mt-2"
                />
              </div>

              {/* Weiterempfehlung */}
              <div>
                <Label className="text-base font-medium">Würden Sie die App weiterempfehlen? (1 = nein, 10 = definitiv)</Label>
                <RadioGroup value={recommendation} onValueChange={setRecommendation} className="mt-2">
                  <div className="grid grid-cols-5 gap-2">
                    {[1,2,3,4,5,6,7,8,9,10].map(num => (
                      <div key={num} className="flex items-center space-x-2">
                        <RadioGroupItem value={num.toString()} id={`rating-${num}`} />
                        <Label htmlFor={`rating-${num}`} className="text-sm">{num}</Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Zusätzliche Kommentare */}
              <div>
                <Label htmlFor="comments" className="text-base font-medium">Weitere Kommentare (optional)</Label>
                <Textarea
                  id="comments"
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  placeholder="Was möchten Sie uns noch mitteilen?"
                  className="mt-2"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !howFound || !frequency || !mostUseful || !recommendation}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Umfrage absenden
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SurveyPage;