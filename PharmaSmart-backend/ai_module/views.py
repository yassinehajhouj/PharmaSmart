from datetime import datetime
from pathlib import Path
import re
import unicodedata

import pandas as pd
import requests
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Categorie, Medicament
from pharmacies.models import PharmacyProfile

from .models import Conversation, Message, OllamaConfig, Prediction
from .serializers import (
    ChatMessageSerializer,
    ConversationListSerializer,
    ConversationSerializer,
    MessageSerializer,
    OllamaConfigSerializer,
    PredictionSerializer,
)


PROSPECTUS_CSV_PATH = Path(__file__).resolve().parent / "prospectus_medicaments.csv"
PROSPECTUS_COLUMNS = [
    "nom_medicament",
    "nom_commercial",
    "indications",
    "posologie",
    "contre_indications",
    "effets_secondaires",
    "precautions_emploi",
    "interactions_medicamenteuses",
    "conservation",
]
FRENCH_STOPWORDS = {
    "a", "ai", "au", "aux", "avec", "ce", "ces", "comme", "comment", "dans",
    "de", "des", "du", "elle", "en", "est", "et", "faire", "il", "je", "la",
    "le", "les", "leur", "ma", "me", "mes", "mon", "ne", "nous", "ou", "par",
    "pas", "plus", "pour", "pouvez", "peux", "quel", "quelle", "quelles",
    "quels", "resume", "resumer", "résume", "résumer", "sa", "se", "ses",
    "sur", "tu", "un", "une", "vos", "votre", "notice", "prospectus",
    "medicament", "médicament", "moi", "donne", "donner",
}


def normalize_text(value):
    if value is None:
        return ""
    text = str(value).strip().lower()
    text = unicodedata.normalize("NFKD", text)
    return "".join(char for char in text if not unicodedata.combining(char))


def tokenize_question(message):
    tokens = re.findall(r"[a-zA-Z0-9]+", normalize_text(message))
    return [token for token in tokens if token not in FRENCH_STOPWORDS]


def load_prospectus_dataframe():
    if not PROSPECTUS_CSV_PATH.exists():
        return pd.DataFrame(columns=PROSPECTUS_COLUMNS + ["normalized_nom", "normalized_commercial"])

    dataframe = pd.read_csv(
        PROSPECTUS_CSV_PATH,
        sep=";",
        encoding="utf-8",
        on_bad_lines="skip",
    )
    dataframe = dataframe.fillna("")
    dataframe["normalized_nom"] = dataframe["nom_medicament"].apply(normalize_text)
    dataframe["normalized_commercial"] = dataframe["nom_commercial"].apply(normalize_text)
    return dataframe


df_medicaments = load_prospectus_dataframe()


def find_medicament_row(user_message="", medicament_name=None):
    if df_medicaments.empty:
        return "Aucun description pour le moment."

    candidates = []
    normalized_message = normalize_text(user_message)

    if medicament_name:
        candidates.append(normalize_text(medicament_name))

    if normalized_message:
        for _, row in df_medicaments.iterrows():
            names = [row.get("normalized_nom", ""), row.get("normalized_commercial", "")]
            for name in names:
                if name and name in normalized_message:
                    candidates.append(name)

    for token in tokenize_question(user_message):
        candidates.append(token)

    seen = set()
    ordered_candidates = []
    for candidate in sorted(candidates, key=len, reverse=True):
        if candidate and candidate not in seen:
            seen.add(candidate)
            ordered_candidates.append(candidate)

    for candidate in ordered_candidates:
        matches = df_medicaments[
            df_medicaments["normalized_nom"].str.contains(candidate, na=False)
            | df_medicaments["normalized_commercial"].str.contains(candidate, na=False)
        ]
        if not matches.empty:
            return matches.iloc[0]

    return None


def format_field(value):
    text = str(value).strip()
    return text if text else "Non disponible"


def build_prospectus_summary(row):
    return (
        f"PROSPECTUS - {format_field(row.get('nom_medicament'))}\n\n"
        f"Indications :\n{format_field(row.get('indications'))}\n\n"
        f"Effets secondaires :\n{format_field(row.get('effets_secondaires'))}\n\n"
        f"Posologie :\n{format_field(row.get('posologie'))}\n\n"
        f"Contre-indications :\n{format_field(row.get('contre_indications'))}\n\n"
        f"Precautions d'emploi :\n{format_field(row.get('precautions_emploi'))}\n\n"
        f"Interactions medicamenteuses :\n{format_field(row.get('interactions_medicamenteuses'))}\n\n"
        f"Conservation :\n{format_field(row.get('conservation'))}"
    )


def detect_prospectus_intent(user_message, intent="GENERAL"):
    normalized_message = normalize_text(user_message)
    return intent == "PROSPECTUS" or any(
        keyword in normalized_message
        for keyword in ("prospectus", "notice", "resume", "resumer")
    )


def is_waiting_for_medicament_name(conversation):
    last_assistant_message = (
        conversation.messages.filter(role=Message.Role.ASSISTANT)
        .order_by("-created_at")
        .first()
    )
    if not last_assistant_message:
        return False

    normalized_content = normalize_text(last_assistant_message.contenu)
    return "preciser le nom du medicament" in normalized_content


def is_prospectus_context_active(conversation):
    if conversation is None:
        return False

    recent_messages = conversation.messages.order_by("-created_at")[:6]
    for message in recent_messages:
        normalized_content = normalize_text(message.contenu)
        if message.role == Message.Role.ASSISTANT and normalized_content.startswith("prospectus -"):
            return True
        if message.role == Message.Role.USER and any(
            keyword in normalized_content for keyword in ("prospectus", "notice", "resume", "resumer")
        ):
            return True

    return False


def resolve_intent(conversation, user_message, medicament_name=None, intent="GENERAL"):
    if detect_prospectus_intent(user_message, intent):
        return "PROSPECTUS"

    medicament = find_medicament_row(user_message=user_message, medicament_name=medicament_name)
    if medicament is not None and conversation is not None and (
        is_waiting_for_medicament_name(conversation) or is_prospectus_context_active(conversation)
    ):
        return "PROSPECTUS"

    return intent or "GENERAL"


def generate_fallback_response(user_message, medicament_name=None, intent="GENERAL"):
    if detect_prospectus_intent(user_message, intent):
        medicament = find_medicament_row(user_message=user_message, medicament_name=medicament_name)
        if medicament is None:
            return "Veuillez preciser le nom du medicament pour que je resume son prospectus."
        return build_prospectus_summary(medicament)

    medicament = find_medicament_row(user_message=user_message, medicament_name=medicament_name)
    if medicament is None:
        return "Je peux vous aider a resumer un prospectus ou trouver un medicament."

    texte = normalize_text(user_message)
    if "effet" in texte or "secondaire" in texte:
        reponse = medicament.get("effets_secondaires", "")
    elif "posologie" in texte or "dose" in texte:
        reponse = medicament.get("posologie", "")
    elif "contre" in texte:
        reponse = medicament.get("contre_indications", "")
    elif "interaction" in texte:
        reponse = medicament.get("interactions_medicamenteuses", "")
    elif "conservation" in texte:
        reponse = medicament.get("conservation", "")
    elif "indication" in texte:
        reponse = medicament.get("indications", "")
    else:
        reponse = medicament.get("precautions_emploi", "")

    return (
        f"Medicament : {format_field(medicament.get('nom_medicament'))}\n\n"
        f"Reponse :\n{format_field(reponse)}"
    )


class PharmacyDataMixin:
    """Mixin pour recuperer les donnees PharmaSmart."""

    def get_pharmacy_context(self):
        medicaments = Medicament.objects.all()[:20]
        med_list = []
        for med in medicaments:
            med_list.append(
                f"- {med.nom} ({med.categorie.nom if med.categorie else 'Sans categorie'}): "
                f"{med.prix} DH - {med.description[:100] if med.description else 'Pas de description'}"
            )

        categories = Categorie.objects.all()
        cat_list = [cat.nom for cat in categories]

        pharmacies = PharmacyProfile.objects.filter(
            approval_status="APPROVED",
            is_active=True,
        )[:10]
        pharma_list = []
        for pharma in pharmacies:
            pharma_list.append(f"- {pharma.nom_pharmacie} ({pharma.ville}): {pharma.telephone}")

        return f"""
Tu es l'assistant intelligent de PharmaSmart, une plateforme e-pharmacie au Maroc.

Date actuelle: {datetime.now().strftime('%d/%m/%Y %H:%M')}

MEDICAMENTS DISPONIBLES ({medicaments.count()} produits):
{chr(10).join(med_list) if med_list else "Aucun medicament disponible"}

CATEGORIES: {', '.join(cat_list) if cat_list else "Aucune categorie"}

PHARMACIES PARTENAIRES ({pharmacies.count()} pharmacies):
{chr(10).join(pharma_list) if pharma_list else "Aucune pharmacie disponible"}

INSTRUCTIONS:
- Reponds toujours en francais
- Sois professionnel et bienveillant
- Si on te demande un medicament, verifie s'il est dans la liste
- Pour les medicaments sur ordonnance, rappelle qu'une ordonnance est necessaire
- Si tu ne connais pas un medicament, dis-le honnetement
- Tu peux recommander des pharmacies partenaires
- Ne donne jamais de diagnostic medical, conseille de consulter un medecin
""".strip()


class ConversationViewSet(viewsets.ModelViewSet, PharmacyDataMixin):
    """API endpoint pour les conversations."""

    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return ConversationListSerializer
        return ConversationSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _get_smart_fallback_response(self, user_message, medicament_name=None, intent="GENERAL"):
        return generate_fallback_response(user_message, medicament_name=medicament_name, intent=intent)

    def _call_ollama(self, conversation, user_message, config, medicament_name=None, intent="GENERAL"):
        messages = []
        pharmacy_context = self.get_pharmacy_context()
        system_prompt = (config.system_prompt or "").strip()
        if system_prompt:
            pharmacy_context = f"{pharmacy_context}\n\n{system_prompt}"

        messages.append({"role": "system", "content": pharmacy_context})

        for msg in conversation.messages.all().order_by("-created_at")[:10][::-1]:
            messages.append({"role": msg.role.lower(), "content": msg.contenu})

        response = requests.post(
            f"{config.url_ollama}/api/chat",
            json={
                "model": config.modele,
                "messages": messages + [{"role": "user", "content": user_message}],
                "stream": False,
                "options": {"temperature": float(config.temperature)},
            },
            timeout=120,
        )

        if response.status_code == 200:
            data = response.json()
            content = data.get("message", {}).get("content", "").strip()
            if content:
                return content

        return self._get_smart_fallback_response(
            user_message,
            medicament_name=medicament_name,
            intent=intent,
        )

    @action(detail=True, methods=["post"])
    def envoyer_message(self, request, pk=None):
        conversation = self.get_object()
        serializer = ChatMessageSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_message = serializer.validated_data["message"]
        medicament_name = serializer.validated_data.get("medicament")
        intent = resolve_intent(
            conversation,
            user_message,
            medicament_name=medicament_name,
            intent=serializer.validated_data.get("intent", "GENERAL"),
        )

        Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            contenu=user_message,
        )

        try:
            config = OllamaConfig.objects.filter(is_active=True).first()
            if intent == "PROSPECTUS":
                ai_response = self._get_smart_fallback_response(
                    user_message,
                    medicament_name=medicament_name,
                    intent=intent,
                )
            elif config:
                ai_response = self._call_ollama(
                    conversation,
                    user_message,
                    config,
                    medicament_name=medicament_name,
                    intent=intent,
                )
            else:
                ai_response = self._get_smart_fallback_response(
                    user_message,
                    medicament_name=medicament_name,
                    intent=intent,
                )
        except Exception:
            ai_response = self._get_smart_fallback_response(
                user_message,
                medicament_name=medicament_name,
                intent=intent,
            )

        Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            contenu=ai_response,
        )

        return Response(
            {
                "user_message": user_message,
                "ai_response": ai_response,
                "conversation_id": conversation.id,
            }
        )


class ChatView(APIView, PharmacyDataMixin):
    """API endpoint simplifie pour le chat."""

    permission_classes = [permissions.AllowAny]

    def _get_smart_fallback_response(self, user_message, medicament_name=None, intent="GENERAL"):
        return generate_fallback_response(user_message, medicament_name=medicament_name, intent=intent)

    def _call_ollama(self, conversation, user_message, config, medicament_name=None, intent="GENERAL"):
        messages = []
        pharmacy_context = self.get_pharmacy_context()
        system_prompt = (config.system_prompt or "").strip()
        if system_prompt:
            pharmacy_context = f"{pharmacy_context}\n\n{system_prompt}"

        messages.append({"role": "system", "content": pharmacy_context})

        for msg in conversation.messages.all().order_by("-created_at")[:10][::-1]:
            messages.append({"role": msg.role.lower(), "content": msg.contenu})

        response = requests.post(
            f"{config.url_ollama}/api/chat",
            json={
                "model": config.modele,
                "messages": messages + [{"role": "user", "content": user_message}],
                "stream": False,
                "options": {"temperature": float(config.temperature)},
            },
            timeout=120,
        )

        if response.status_code == 200:
            data = response.json()
            content = data.get("message", {}).get("content", "").strip()
            if content:
                return content

        return self._get_smart_fallback_response(
            user_message,
            medicament_name=medicament_name,
            intent=intent,
        )

    def _call_ollama_stateless(self, user_message, config, medicament_name=None, intent="GENERAL"):
        pharmacy_context = self.get_pharmacy_context()
        system_prompt = (config.system_prompt or "").strip()
        if system_prompt:
            pharmacy_context = f"{pharmacy_context}\n\n{system_prompt}"

        response = requests.post(
            f"{config.url_ollama}/api/chat",
            json={
                "model": config.modele,
                "messages": [
                    {"role": "system", "content": pharmacy_context},
                    {"role": "user", "content": user_message},
                ],
                "stream": False,
                "options": {"temperature": float(config.temperature)},
            },
            timeout=120,
        )

        if response.status_code == 200:
            data = response.json()
            content = data.get("message", {}).get("content", "").strip()
            if content:
                return content

        return self._get_smart_fallback_response(
            user_message,
            medicament_name=medicament_name,
            intent=intent,
        )

    def post(self, request):
        serializer = ChatMessageSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_message = serializer.validated_data["message"]
        medicament_name = serializer.validated_data.get("medicament")
        conversation_id = serializer.validated_data.get("conversation_id")
        is_authenticated = bool(request.user and request.user.is_authenticated)

        if not is_authenticated:
            intent = resolve_intent(
                None,
                user_message,
                medicament_name=medicament_name,
                intent=serializer.validated_data.get("intent", "GENERAL"),
            )

            try:
                config = OllamaConfig.objects.filter(is_active=True).first()
                if intent == "PROSPECTUS":
                    ai_response = self._get_smart_fallback_response(
                        user_message,
                        medicament_name=medicament_name,
                        intent=intent,
                    )
                elif config:
                    ai_response = self._call_ollama_stateless(
                        user_message,
                        config,
                        medicament_name=medicament_name,
                        intent=intent,
                    )
                else:
                    ai_response = self._get_smart_fallback_response(
                        user_message,
                        medicament_name=medicament_name,
                        intent=intent,
                    )
            except Exception:
                ai_response = self._get_smart_fallback_response(
                    user_message,
                    medicament_name=medicament_name,
                    intent=intent,
                )

            return Response(
                {
                    "conversation_id": None,
                    "user_message": user_message,
                    "ai_response": ai_response,
                }
            )

        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, user=request.user)
            except Conversation.DoesNotExist:
                return Response(
                    {"error": "Conversation non trouvee"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            conversation = Conversation.objects.create(
                user=request.user,
                titre=user_message[:50],
            )

        intent = resolve_intent(
            conversation,
            user_message,
            medicament_name=medicament_name,
            intent=serializer.validated_data.get("intent", "GENERAL"),
        )

        Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            contenu=user_message,
        )

        try:
            config = OllamaConfig.objects.filter(is_active=True).first()
            if intent == "PROSPECTUS":
                ai_response = self._get_smart_fallback_response(
                    user_message,
                    medicament_name=medicament_name,
                    intent=intent,
                )
            elif config:
                ai_response = self._call_ollama(
                    conversation,
                    user_message,
                    config,
                    medicament_name=medicament_name,
                    intent=intent,
                )
            else:
                ai_response = self._get_smart_fallback_response(
                    user_message,
                    medicament_name=medicament_name,
                    intent=intent,
                )
        except Exception:
            ai_response = self._get_smart_fallback_response(
                user_message,
                medicament_name=medicament_name,
                intent=intent,
            )

        Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            contenu=ai_response,
        )

        return Response(
            {
                "conversation_id": conversation.id,
                "user_message": user_message,
                "ai_response": ai_response,
            }
        )


class PredictionViewSet(viewsets.ModelViewSet):
    """API endpoint pour les predictions."""

    serializer_class = PredictionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, "pharmacy_profile"):
            return Prediction.objects.filter(pharmacie=user.pharmacy_profile)
        return Prediction.objects.none()

    @action(detail=False, methods=["get"])
    def recentes(self, request):
        predictions = self.get_queryset()[:10]
        serializer = PredictionSerializer(predictions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def generer(self, request):
        medicament_id = request.data.get("medicament_id")
        type_prediction = request.data.get("type_prediction", "DEMANDE")

        import random
        from datetime import date, timedelta

        prediction = Prediction.objects.create(
            pharmacie=request.user.pharmacy_profile,
            medicament_id=medicament_id,
            type_prediction=type_prediction,
            valeur_predite=random.randint(10, 100),
            unite="unites",
            confiance=random.uniform(70, 95),
            periode_debut=date.today(),
            periode_fin=date.today() + timedelta(days=30),
            modele_utilise="Simulation v1.0",
        )

        return Response(
            PredictionSerializer(prediction).data,
            status=status.HTTP_201_CREATED,
        )


class OllamaConfigViewSet(viewsets.ModelViewSet):
    """API endpoint pour la configuration Ollama."""

    queryset = OllamaConfig.objects.all()
    serializer_class = OllamaConfigSerializer
    permission_classes = [permissions.IsAdminUser]
