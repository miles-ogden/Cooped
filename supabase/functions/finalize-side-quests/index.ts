import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find all expired quests that haven't been finalized yet
    const { data: expiredQuests, error: questError } = await supabase
      .from("side_quests")
      .select("*")
      .lt("expires_at", new Date().toISOString())
      .eq("status", "active")

    if (questError) {
      throw new Error(`Failed to fetch expired quests: ${questError.message}`)
    }

    if (!expiredQuests || expiredQuests.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No expired quests to finalize",
          finalized: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    const finalizedQuests = []

    // Process each expired quest
    for (const quest of expiredQuests) {
      try {
        // Get all attempts for this quest
        const { data: attempts, error: attemptsError } = await supabase
          .from("side_quest_attempts")
          .select("*")
          .eq("quest_id", quest.id)

        if (attemptsError) {
          console.error(`Error fetching attempts for quest ${quest.id}:`, attemptsError)
          continue
        }

        if (!attempts || attempts.length === 0) {
          // No attempts, just mark as completed
          await supabase
            .from("side_quests")
            .update({ status: "completed" })
            .eq("id", quest.id)
          continue
        }

        // Calculate composite scores for all attempts
        const minTime = Math.min(...attempts.map((a) => a.time_taken_seconds))
        const maxTime = Math.max(...attempts.map((a) => a.time_taken_seconds))
        const timeRange = maxTime - minTime || 1

        const withScores = attempts.map((attempt) => {
          const accuracyScore = attempt.accuracy_percent

          const speedScore =
            minTime === maxTime
              ? 100
              : 100 - ((attempt.time_taken_seconds - minTime) / timeRange) * 100

          const compositeScore = (accuracyScore * 0.8) + (speedScore * 0.2)

          return {
            ...attempt,
            speedScore: Math.round(speedScore),
            compositeScore: Math.round(compositeScore * 100) / 100,
          }
        })

        // Sort by composite score
        const sorted = withScores.sort((a, b) => b.compositeScore - a.compositeScore)

        // Assign placements and XP
        const xpRewards = [250, 200, 150]
        const baseXp = 100
        const placements = []

        for (let i = 0; i < sorted.length; i++) {
          const attempt = sorted[i]
          let xpEarned = baseXp

          if (i === 0) xpEarned = xpRewards[0]
          else if (i === 1) xpEarned = xpRewards[1]
          else if (i === 2) xpEarned = xpRewards[2]

          placements.push({
            attempt_id: attempt.id,
            user_id: attempt.user_id,
            placement: i + 1,
            xp_earned: xpEarned,
            accuracy: attempt.accuracy_percent,
            compositeScore: attempt.compositeScore,
          })
        }

        // Update all attempts with placement and XP
        for (const placement of placements) {
          const { error: updateError } = await supabase
            .from("side_quest_attempts")
            .update({
              placement: placement.placement,
              xp_earned: placement.xp_earned,
            })
            .eq("id", placement.attempt_id)

          if (updateError) {
            console.error(`Error updating attempt ${placement.attempt_id}:`, updateError)
          } else {
            // Award XP to user
            const { error: userError } = await supabase.rpc("add_xp_to_user", {
              user_id: placement.user_id,
              xp_amount: placement.xp_earned,
            })

            if (userError) {
              console.error(`Error awarding XP to user ${placement.user_id}:`, userError)
            }
          }
        }

        // Mark quest as completed
        const { error: completeError } = await supabase
          .from("side_quests")
          .update({ status: "completed" })
          .eq("id", quest.id)

        if (completeError) {
          console.error(`Error marking quest ${quest.id} as completed:`, completeError)
        } else {
          finalizedQuests.push({
            quest_id: quest.id,
            participants: placements.length,
            placements: placements,
          })
        }
      } catch (err) {
        console.error(`Error processing quest ${quest.id}:`, err)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Finalized ${finalizedQuests.length} quests`,
        finalized: finalizedQuests,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (err) {
    console.error("Error in finalize-side-quests function:", err)
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
